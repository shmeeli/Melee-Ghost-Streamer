const chokidar = require("chokidar");

let directory;
let watcher;

let callbackStarted;
let callbackFinished;

onGameStarted = cb => {
    callbackStarted = cb
}

onGameFinished = cb => {
    callbackFinished = cb
}

const gameByPath = {};

let timeout;

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