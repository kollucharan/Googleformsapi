
// 'use strict';

// const express = require('express');
// const path = require('path');
// const { google } = require('@googleapis/forms');
// const { authenticate } = require('@google-cloud/local-auth');

// const app = express();
// const port = 3000;


// app.use(express.json());

// let authClient;


// async function initAuth() {
//   authClient = await authenticate({
//     keyfilePath: path.join(__dirname, 'credentials.json'),
//     scopes: ['https://www.googleapis.com/auth/forms.body'],
//   });
// }

// // Route to create a Google Form
// app.post('/create-form', async (req, res) => {
//   try {
//     if (!authClient) await initAuth();

//     const forms = google.forms({ version: 'v1', auth: authClient });

//     const newForm = {
//       info: {
//         title: 'Generated Form via Express',
//         description: 'This form is created by your Express backend!',
//       },
//     };

//     const formResponse = await forms.forms.create({
//       requestBody: newForm,
//     });

//     res.status(200).json({
//       message: 'Form created successfully',
//       formId: formResponse.data.formId,
//       formUrl: `https://docs.google.com/forms/d/${formResponse.data.formId}/edit`,
//     });
//   } catch (error) {
//     console.error('Error creating form:', error);
//     res.status(500).json({ error: 'Failed to create form' });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });




const express = require('express');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let oauth2Client;

async function initAuth() {
  oauth2Client = await authenticate({
    keyfilePath: path.join(__dirname, 'credentials.json'), // must exist
    scopes: ['https://www.googleapis.com/auth/forms.body'],
  });

  console.log('✅ Authenticated successfully');
}

app.post('/create-form', async (req, res) => {
  try {
    const questions = req.body.questions;

    const forms = google.forms({ version: 'v1', auth: oauth2Client });

    // STEP 1: Create form with only the title
    const formCreateRes = await forms.forms.create({
      requestBody: {
        info: {
          title: 'Generated Questions',
        },
      },
    });

    const formId = formCreateRes.data.formId;

    // STEP 2: Prepare batch update requests
    const batchRequests = [];

    // Add description
    batchRequests.push({
      updateFormInfo: {
        info: {
          description: 'Please share your honest feedback!',
        },
        updateMask: 'description',
      },
    });

    // Add each question
    questions.forEach((q, index) => {
      batchRequests.push({
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
            index,
          },
        },
      });
    });

    // STEP 3: Send batchUpdate
    await forms.forms.batchUpdate({
      formId,
      requestBody: {
        requests: batchRequests,
      },
    });

    res.json({
      formUrl: `https://docs.google.com/forms/d/${formId}/edit`,
      message: 'Form created successfully!',
    });

  } catch (error) {
    console.error("❌ Error creating form:", error);
    res.status(500).json({ error: "Failed to create form", details: error.message });
  }
});

initAuth().then(() => {
  app.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });
});
