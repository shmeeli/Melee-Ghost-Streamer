const chokidar = require("chokidar");

let directory;
let watcher;

let callbackStarted;
let callbackFinished;
let callbackReplay;

onGameStarted = cb => {
    callbackStarted = cb
}

onGameFinished = cb => {
    callbackFinished = cb
}

onReplay = cb => {
    callbackReplay = cb
}


const gameByPath = {};

let timeout;
let comboCount = 0;

setDirectory = dir => {
    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
        directory = dir
        if (watcher) {
            watcher.close()
        }

        watcher = chokidar.watch(path.join(directory, "*.slp"), {
            ignoreInitial: true,
            usePolling: true,
            interval: 500,
            persistent: true,
        })

        watcher.on("change", path => {
            let gameState, settings, gameEnd;
            try {
                let game = _.get(gameByPath, [path, "game"]);
                if (!game) {
                    console.log(`New file at: ${path}`);
                    // Make sure to enable `processOnTheFly` to get updated stats as the game progresses
                    game = new SlippiGame(path, { processOnTheFly: true });
                    gameByPath[path] = {
                        game: game,
                        state: {
                            settings: null,
                        },
                    };
                }

                gameState = _.get(gameByPath, [path, "state"]);

                settings = game.getSettings();
                gameEnd = game.getGameEnd();
                stats = game.getStats();

                if (stats.combos.length > comboCount && !gameEnd) {
                    if (stats.combos[stats.combos.length - 1].endFrame != null) {
                        comboCount = stats.combos.length;
                        const combo = stats.combos[comboCount - 1];
                        const percentIncrease = combo.endPercent - combo.startPercent;
                        const moveCount = combo.moves.length;
                        const didKill = combo.didKill;

                        console.log(percentIncrease, moveCount, didKill);

                        let score = 0;
                        if (percentIncrease >= 30) {
                            score += 1;
                        }

                        if (moveCount >= 4) {
                            score += 1;
                        }

                        if (didKill) {
                            score += 1;
                        }

                        if (score >= 2) {
                            if (callbackReplay) {
                                console.log("Made a Combo replay!", combo)
                                setTimeout(callbackReplay, 1000);
                            }
                        }
                    }
                }
            } catch (err) {
                console.log(err);
                return;
            }

            if (!gameState.settings && settings) {
                console.log(`[Game Start] New game has started`);
                gameState.settings = settings;

                if (callbackStarted) {
                    const game = gameByPath[path].game;
                    const gameData = getGameData(game);
                    if (!gameData) {
                        return;
                    }
                    callbackStarted(gameData)
                }
            }

            if (gameEnd) {
                comboCount = 0;

                if (callbackReplay) {
                    callbackReplay();
                }

                if (callbackFinished) {
                    const game = gameByPath[path].game;
                    const gameData = getGameData(game)
                    if (!gameData) {
                        return;
                    }
                    callbackFinished(gameData)
                }
            }
        });
    }, 1000);
}