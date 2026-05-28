const SheetsService = {
    async criarPlanilha(token, nome, abas) {
        const body = {
            properties: { title: nome },
            sheets: abas.map(aba => ({
                properties: { title: aba.nome },
                data: [{
                    startRow: 0, startColumn: 0,
                    rowData: [{ values: aba.cabecalhos.map(h => ({ userEnteredValue: { stringValue: h } })) }]
                }]
            }))
        };
        const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await resp.json();
    },

    async lerLinhas(token, sheetId, aba) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(aba)}`;
        const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        const data = await resp.json();
        return data.values || [];
    },

    async adicionarLinha(token, sheetId, aba, valores) {
        const range = encodeURIComponent(aba);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
        await fetch(url, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [valores] })
        });
    },

    async atualizarLinha(token, sheetId, aba, linhaNum, valores) {
        const range = encodeURIComponent(`${aba}!A${linhaNum}`);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`;
        await fetch(url, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [valores] })
        });
    },

    async listarAbas(token, sheetId) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
        const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        const data = await resp.json();
        return (data.sheets || []).map(s => s.properties.title);
    },

    async adicionarAba(token, sheetId, nomeAba, cabecalhos) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ addSheet: { properties: { title: nomeAba } } }] })
        });
        await this.adicionarLinha(token, sheetId, nomeAba, cabecalhos);
    }
};
