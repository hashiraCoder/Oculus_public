function executeCode(req, res) {
    const code = req.body.code;
    
    eval(code);
}

function safeEval() {
    eval("console.log('Safe');");
}
