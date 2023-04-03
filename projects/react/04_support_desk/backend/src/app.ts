import express, { Express, Request, Response } from 'express';
import cors from 'cors';

const app: Express = express();
app.use(cors());

// @ts-ignore
if (import.meta.env.PROD) {
  const port: number = 3001;

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}

app.get('/', (_: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the Support Desk API!' });
});

console.log('Express app created...');

export const viteNodeApp = app;
