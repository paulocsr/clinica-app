const DriveService = {
    async listarPastas(token, nome) {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${nome}' and trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
        const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        const data = await resp.json();
        return data.files || [];
    },

    async criarPasta(token, nome, parentId = null) {
        const body = { name: nome, mimeType: 'application/vnd.google-apps.folder' };
        if (parentId) body.parents = [parentId];
        const resp = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await resp.json();
    },

    async buscarOuCriarPasta(token, nome, parentId = null) {
        const pastas = await this.listarPastas(token, nome);
        if (pastas.length > 0) return pastas[0];
        return await this.criarPasta(token, nome, parentId);
    },

    async moverArquivo(token, fileId, pastaDestinoId) {
        const metaResp = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
            { headers: { Authorization: 'Bearer ' + token } }
        );
        const { parents } = await metaResp.json();
        await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${pastaDestinoId}&removeParents=${(parents || []).join(',')}`,
            { method: 'PATCH', headers: { Authorization: 'Bearer ' + token } }
        );
    }
};
