import { NextApiRequest, NextApiResponse } from 'next';

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

export function withErrorHandler(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      
      const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
      
      res.status(statusCode).json({
        error: 'Something went wrong',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred. Please try again later.' 
          : error instanceof Error 
            ? error.message 
            : String(error),
        stack: process.env.NODE_ENV === 'production' 
          ? undefined 
          : error instanceof Error 
            ? error.stack 
            : undefined
      });
    }
  };
}

export default withErrorHandler; 