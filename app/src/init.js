const fs = require('fs');
const path = require('path');

function logError(error) {
    const errorFilePath = path.join(__dirname, 'errors.txt');
    const errorMessage = `${new Date().toLocaleString()}: ${error}\n`;

    fs.appendFile(errorFilePath, errorMessage, (err) => {
        if (err) {
            console.error('Error writing to the error log file:', err);
        }
    });
}