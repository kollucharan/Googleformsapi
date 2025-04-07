const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Step 1: Start OAuth Flow
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/forms.body'],
  });
  res.redirect(authUrl);
});

// Step 2: Callback URI
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  req.app.set('authClient', oauth2Client); // Save in memory
  res.send('Authentication successful! You can now use the API.');
});

// Step 3: API to create form
app.post('/create-form', async (req, res) => {
  // const authClient = req.app.get('authClient');
  // if (!authClient) return res.status(401).send({ error: 'User not authenticated' });

  const forms = google.forms({ version: 'v1', auth: authClient });

  const newForm = {
    info: {
      title: req.body.title || 'My Form',
    },
  };

  try {
    const createdForm = await forms.forms.create({ requestBody: newForm });

    // Add questions using batchUpdate
    const updateReq = {
      formId: createdForm.data.formId,
      requestBody: {
        requests: req.body.questions.map((q, index) => ({
          createItem: {
            item: {
              title: q.question,
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {},
                },
              },
            },
            location: {
              index: index,
            },
          },
        })),
      },
    };

    await forms.forms.batchUpdate(updateReq);
    res.send({ formUrl: `https://docs.google.com/forms/d/${createdForm.data.formId}/edit` });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).send({ error: 'Failed to create form' });
  }
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
