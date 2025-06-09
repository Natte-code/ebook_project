const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '../content/raw';
const OUTPUT_FILE = '../chapters/chapters.json';

const chapters = {};

// Läs alla .txt filer i källmappen
fs.readdir(SOURCE_DIR, (err, files) => {
    if (err) throw err;

    files.filter(file => file.endsWith('.txt')).forEach(file => {
        const content = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
        const chapterNum = file.match(/\d+/)[0];

        chapters[chapterNum] = {
            title: content.split('\n')[0], // Första raden är titeln
            content: content.split('\n').slice(1).join('\n'), // Resten är innehåll
            wordCount: content.split(/\s+/).length
        };
    });

    // Spara alla kapitel i en JSON-fil
    fs.writeFileSync(
        path.join(__dirname, OUTPUT_FILE),
        JSON.stringify({ chapters }, null, 2)
    );
});
