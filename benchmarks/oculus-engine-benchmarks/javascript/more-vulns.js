function executeCommand(req, res) {
    const cmd = req.body.cmd;
    require('child_process').execSync(cmd); // JS-CMD-001
}

function readFile(req, res) {
    const file = req.body.file;
    require('fs').readFileSync(__dirname + '/' + file); // JS-PATH-001
}

function render(req, res) {
    const name = req.body.name;
    res.send("<h1>Hello " + name + "</h1>"); // JS-XSS-002
    
    document.getElementById('app').innerHTML = `<div>${name}</div>`; // JS-XSS-001
}
