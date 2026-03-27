export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: `Tu es un assistant IA avec un corps holographique humanoïde. Tu parles en français. Tu es amical, naturel et concis dans tes réponses car elles seront lues à voix haute. Garde tes réponses courtes (2-3 phrases max) pour que ce soit agréable à écouter. Tu t'appelles Claude. Tu es créé par Anthropic. Ne mets pas de formatage markdown, astérisques ou caractères spéciaux dans tes réponses car elles sont lues à voix haute.`,
                messages: messages || []
            })
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
