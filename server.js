const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Verificação de configuração do Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error("ERRO: A variável de ambiente STRIPE_SECRET_KEY não está definida.");
    process.exit(1); // Encerra o processo se a chave não estiver configurada
}
const stripe = require('stripe')(stripeSecretKey);
const frontendUrl = process.env.FRONTEND_URL;

// Rota de teste para verificar se o servidor está no ar
app.get('/', (req, res) => {
  res.json({ message: "Servidor DUXJURÍDICO no ar! A comunicação está funcionando." });
});

app.post('/create-checkout-session', async (req, res) => {
    const { planName, price, cycle, email } = req.body;

    if (!frontendUrl) {
        return res.status(500).json({ error: "A URL do frontend não está configurada no servidor." });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `Plano ${planName} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`,
                        },
                        unit_amount: parseFloat(price) * 100, // Preço em centavos
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: email,
            success_url: `${frontendUrl}?success=true`,
            cancel_url: `${frontendUrl}?canceled=true`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Erro ao criar sessão do Stripe:", error);
        res.status(500).json({ error: 'Falha ao criar sessão de pagamento.' });
    }
});


// Rota do Webhook (para o futuro, quando precisar confirmar o pagamento)
app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
    // Lógica do webhook aqui
    response.status(200).send();
});

// A Render usa a variável de ambiente PORT. Usamos ela ou a porta 4242 como padrão.
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));

