import express from 'express';
import securityRoutes from './routes/security.js';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
app.use('/security', securityRoutes);

app.get('/', (req, res) => res.json({status:'ok'}));

app.listen(3000, () => console.log('🚀 API running on http://localhost:3000'));
