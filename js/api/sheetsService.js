const SheetsService = {
    async criarPlanilha(token, nome, abas) {
        const body = {
            properties: { title: nome },
            sheets: abas.map(aba => ({
                properties: { title: aba.nome },
                data: [{
                    startRow: 0,
                    startColumn: 0,
                    rowData: [{
                        values: aba.cabecalhos.map(h => ({
                            userEnteredValue: { stringValue: h }
                        }))
                    }]
                }]
            }))
        };
        const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await resp.json();
    }
};
