const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

app.use(express.json());
app.use(cors());

// A URL do seu site na Vercel será configurada aqui depois
const YOUR_DOMAIN = process.env.FRONTEND_URL || 'http://localhost:5500';

app.post('/create-checkout-session', async (req, res) => {
  const { planName, price, cycle, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${planName} - DUXJURÍDICO`,
              description: `Assinatura ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`,
            },
            unit_amount: parseFloat(price) * 100, // Preço em centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}?success=true`,
      cancel_url: `${YOUR_DOMAIN}?canceled=true`,
      customer_email: email,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error);
    res.status(500).json({ error: 'Falha ao criar sessão de pagamento.' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

