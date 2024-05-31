import express from "express";
import serverless from "serverless-http";
import modelRoutes from './routes/modelRoutes.js';
import cors from 'cors'
import logClickstreamMiddleware from './middleware/logMiddleware.js';

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} and listening on PORT ${PORT}`.blue)
});

app.use(logClickstreamMiddleware);

app.get('/', (req, res) => {
  res.send('API is running...')
});

app.use('/api/models/', modelRoutes);

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

export const handler = serverless(app);
