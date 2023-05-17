let {
    SlippiGame, characters: characterUtil
} = require('@slippi/slippi-js');
const _ = require('lodash');


function parseGame(game) {
    return {
        settings: game.getSettings(),
        frames: game.getFrames(),
        stats: game.getStats(),
        metadata: game.getMetadata(),
        latestFrame: game.getLatestFrame(),
        gameEnd: game.getGameEnd(),
        parser: game.parser,
        finalStats: game.finalStats,
    };
}

function wasHandwarmers(game) {
    if (game.parser.gameEnd == null) {
        return false;
    }

    let score = 0;

    const startStocks = game.parser.settings.players[0].startStocks;

    if (game.finalStats.overall.every(t => t.totalDamage < 50)) {
        score += 1;
    } else {
        score -= 1;
    }

    // Is pause enabled?
    if (game.parser.settings.gameInfoBlock.gameBitfield3 < 142) {

        // Was the game ended with lras?
        if (game.parser.gameEnd.gameEndMethod == 7) {
            score += 1;
        } else {
            // If this was handwarmers it's weird that they didn't use lras
            score -= 1;
        }


        let stocksPlayer1 = 0;
        let stocksPlayer2 = 0;

        game.finalStats.stocks.forEach((stock) => {
            if (stock.playerIndex == 0) {
                stocksPlayer1 += 1;
            } else {
                stocksPlayer2 += 1;
            }
        });

        // Checking if the lras was not for the last stock.
        if (stocksPlayer1 < startStocks - 1 && stocksPlayer2 < startStocks - 1) {
            score += 2;
        }
    } else {
        if (startStocks > 2) {
            if (game.finalStats.overall.every(t => t.killCount <= 1)) {
                score += 1;
            }
        }
    }

    if (startStocks > 2) {
        // Check if the game's duration was less than 45 seconds
        if ((game.metadata.lastFrame + 123) / 60 < 45) {
            score += 1;
        }
    }

    return score >= 2;
}

function isProperGame(game) {
    if (wasHandwarmers(game)) {
        return false;
    }

    if (game.settings.players.length != 2) {
        return false;
    }

    return true;
}

function generateGameInfo(game) {
    const getResultForPlayer = (game, playerIndex) => {
        // Calculate assumed game result
        const gameEnd = game.gameEnd;
        if (!gameEnd) {
            return "unknown";
        }

        const players = _.get(game.settings, ['players']);
        const opp = _.filter(players, player => player.playerIndex !== playerIndex);
        const oppIndex = _.get(opp, [0, 'playerIndex']);

        switch (gameEnd.gameEndMethod) {
            case 1:
                // This is a TIME! ending, not implemented yet
                return "unknown";
            case 2:
                // This is a GAME! ending
                const latestFrame = _.get(game.latestFrame, 'players') || [];
                const playerStocks = _.get(latestFrame, [playerIndex, 'post', 'stocksRemaining']);
                const oppStocks = _.get(latestFrame, [oppIndex, 'post', 'stocksRemaining']);
                if (playerStocks === 0 && oppStocks === 0) {
                    return "unknown";
                }

                return playerStocks === 0 ? "loser" : "winner";
            case 7:
                return gameEnd.lrasInitiatorIndex === playerIndex ? "loser" : "winner";
        }

        return "unknown";
    };

    const generatePlayerInfo = game => player => {
        return {
            port: player.port,
            characterId: player.characterId,
            characterColor: player.characterColor,
            nametag: player.nametag,
            displayName: player.displayName,
            characterName: characterUtil.getCharacterName(player.characterId),
            characterColor: characterUtil.getCharacterColorName(player.characterId, player.characterColor),
            gameResult: getResultForPlayer(game, player.playerIndex),
        };
    };

    const playerInfoGen = generatePlayerInfo(game);

    return {
        players: _.map(game.settings.players, playerInfoGen),
        startTime: game.metadata?.startAt,
        duration: (game.stats.lastFrame + 123) / 60,
        data: game,
    }
}

function getGameData(game) {
    game = parseGame(game);
    if (!isProperGame(game)) {
        return;
    }

    return generateGameInfo(game);
};