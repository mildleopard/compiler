function lexicalAnalyzer(code) {

    const tokens = [];

    const keywords = [
        "let",
        "const",
        "var",
        "if",
        "else",
        "for",
        "while",
        "do",
        "switch",
        "case",
        "break",
        "continue",
        "return",
        "function",
        "true",
        "false",
        "null"
    ];

    let i = 0;
    let line = 1;

    while (i < code.length) {

        let char = code[i];

        // -------------------------
        // WHITESPACE
        // -------------------------

        if (
            char === " " ||
            char === "\t" ||
            char === "\r"
        ) {
            i++;
            continue;
        }

        // -------------------------
        // NEW LINE
        // -------------------------

        if (char === "\n") {
            line++;
            i++;
            continue;
        }

        // -------------------------
        // SINGLE LINE COMMENT
        // -------------------------

        if (
            char === "/" &&
            code[i + 1] === "/"
        ) {

            while (
                i < code.length &&
                code[i] !== "\n"
            ) {
                i++;
            }

            continue;
        }

        // -------------------------
        // MULTI LINE COMMENT
        // -------------------------

        if (
            char === "/" &&
            code[i + 1] === "*"
        ) {

            i += 2;

            while (
                i < code.length &&
                !(
                    code[i] === "*" &&
                    code[i + 1] === "/"
                )
            ) {

                if (code[i] === "\n") {
                    line++;
                }

                i++;
            }

            i += 2;
            continue;
        }

        // -------------------------
        // IDENTIFIER / KEYWORD
        // -------------------------

        if (/[a-zA-Z_]/.test(char)) {

            let value = "";

            while (
                i < code.length &&
                /[a-zA-Z0-9_]/.test(code[i])
            ) {

                value += code[i];
                i++;
            }

            tokens.push({
                type: keywords.includes(value)
                    ? "KEYWORD"
                    : "IDENTIFIER",
                value,
                line
            });

            continue;
        }

        // -------------------------
        // NUMBER
        // -------------------------

        if (/[0-9]/.test(char)) {

            let value = "";
            let hasDot = false;

            while (
                i < code.length &&
                /[0-9.]/.test(code[i])
            ) {

                if (code[i] === ".") {
                    if (hasDot) break;
                    hasDot = true;
                }

                value += code[i];
                i++;
            }

            tokens.push({
                type: "NUMBER",
                value,
                line
            });

            continue;
        }

        // -------------------------
        // STRING
        // -------------------------

        if (
            char === '"' ||
            char === "'"
        ) {

            const quote = char;

            let value = "";

            i++;

            while (
                i < code.length &&
                code[i] !== quote
            ) {

                // handle escape sequences
                if (code[i] === '\\' && i + 1 < code.length) {
                    const next = code[i + 1];
                    if (next === 'n') { value += '\n'; i += 2; continue; }
                    if (next === 't') { value += '\t'; i += 2; continue; }
                    if (next === '\\') { value += '\\'; i += 2; continue; }
                    if (next === '"') { value += '"'; i += 2; continue; }
                    if (next === "'") { value += "'"; i += 2; continue; }
                }

                value += code[i];
                i++;
            }

            if (i >= code.length) {
                tokens.push({
                    type: "LEXICAL_ERROR",
                    value,
                    line,
                    message: "Unterminated string"
                });
                continue;
            }

            i++;

            tokens.push({
                type: "STRING",
                value,
                line
            });

            continue;
        }

        // -------------------------
        // TRIPLE OPERATORS
        // -------------------------

        const threeChar =
            code.substring(i, i + 3);

        const tripleOperators = [
            "===",
            "!=="
        ];

        if (
            tripleOperators.includes(threeChar)
        ) {

            tokens.push({
                type: "OPERATOR",
                value: threeChar,
                line
            });

            i += 3;
            continue;
        }

        // -------------------------
        // MULTI OPERATORS
        // -------------------------

        const twoChar =
            code.substring(i, i + 2);

        const multiOperators = [
            "==",
            "!=",
            "<=",
            ">=",
            "&&",
            "||",
            "++",
            "--",
            "+=",
            "-=",
            "*=",
            "/="
        ];

        if (
            multiOperators.includes(twoChar)
        ) {

            tokens.push({
                type: "OPERATOR",
                value: twoChar,
                line
            });

            i += 2;
            continue;
        }

        // -------------------------
        // SINGLE OPERATORS
        // -------------------------

        const operators = [
            "+",
            "-",
            "*",
            "/",
            "%",
            "=",
            "<",
            ">",
            "!"
        ];

        if (
            operators.includes(char)
        ) {

            tokens.push({
                type: "OPERATOR",
                value: char,
                line
            });

            i++;
            continue;
        }

        // -------------------------
        // DELIMITERS
        // -------------------------

        const delimiters = [
            "(",
            ")",
            "{",
            "}",
            "[",
            "]",
            ";",
            ",",
            ".",
            ":"
        ];

        if (
            delimiters.includes(char)
        ) {

            tokens.push({
                type: "DELIMITER",
                value: char,
                line
            });

            i++;
            continue;
        }

        // -------------------------
        // INVALID TOKEN
        // -------------------------

        tokens.push({
            type: "LEXICAL_ERROR",
            value: char,
            line,
            message:
                `Invalid Character '${char}'`
        });

        i++;
    }

    return {
        totalTokens: tokens.length,
        tokens
    };
}

module.exports = lexicalAnalyzer;