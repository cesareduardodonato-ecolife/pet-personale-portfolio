require('dotenv').config();
const { MongoClient } = require('mongodb');

// Dados fictícios para o seu Portfólio demonstrativo
const dadosIniciais = {
    servicos: [
        { nome: "Banho & Tosa Relaxante", descricao: "Banho com produtos hipoalergênicos, hidratação profunda e tosa na tesoura.", preco: "80,00" },
        { nome: "Spa Pet Personale", descricao: "Massagem relaxante, aromaterapia e ofurô para desestressar o seu pet.", preco: "120,00" },
        { nome: "Tosa Higiênica", descricao: "Limpeza das patinhas, barriga e região íntima para maior conforto e higiene.", preco: "45,00" },
        { nome: "Consulta Veterinária", descricao: "Avaliação geral de rotina com nossos especialistas parceiros.", preco: "150,00" }
    ],
    depoimentos: [
        { autor: "Mariana & Thor (Golden Retriever)", texto: "O melhor atendimento! O Thor sempre volta cheiroso e super feliz!" },
        { autor: "Carlos & Mel (Shih Tzu)", texto: "Amo a facilidade de agendar e o carinho que toda a equipe tem com os pets." },
        { autor: "Fernanda & Luna (Gata Persa)", texto: "O ambiente super tranquilo fez toda a diferença para a minha gatinha!" }
    ],
    galeria: [
        { titulo: "Tosa na Tesoura", url: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&q=80" },
        { titulo: "Banho Relaxante", url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&q=80" },
        { titulo: "Pet Feliz", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80" }
    ]
};

async function popularBanco() {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error("❌ ERRO: MONGODB_URI não encontrada no seu arquivo .env!");
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        console.log("⏳ Conectando ao MongoDB Atlas...");
        await client.connect();
        console.log("✅ Conectado com sucesso ao banco de demonstração!");

        const db = client.db(); // Puxa automaticamente o banco da sua URI (pet_personale_demo)

        // 1. Inserindo na coleção 'servicos'
        console.log("Injetando serviços fictícios...");
        await db.collection('servicos').deleteMany({}); // Limpa testes antigos
        await db.collection('servicos').insertMany(dadosIniciais.servicos);

        // 2. Inserindo na coleção 'depoimentos'
        console.log("Injetando depoimentos...");
        await db.collection('depoimentos').deleteMany({});
        await db.collection('depoimentos').insertMany(dadosIniciais.depoimentos);

        // 3. Inserindo na coleção 'galeria'
        console.log("Injetando galeria de fotos...");
        await db.collection('galeria').deleteMany({});
        await db.collection('galeria').insertMany(dadosIniciais.galeria);

        // 4. Se o seu servidor puxa tudo de uma coleção única chamada 'dados' ou 'site'
        await db.collection('dados').deleteMany({});
        await db.collection('dados').insertOne(dadosIniciais);

        console.log("🚀 SUCESSO ABSOLUTO! O banco foi populado em menos de 5 segundos!");
    } catch (erro) {
        console.error("❌ Erro durante o preenchimento:", erro);
    } finally {
        await client.close();
        console.log("🔒 Conexão encerrada.");
    }
}

popularBanco();