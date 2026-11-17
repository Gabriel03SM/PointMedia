import type { NextFunction, Request, Response } from 'express';

export function mutationProtection(origin: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (
      req.get('X-Pointmedia-Request') !== '1' ||
      (req.get('Origin') && req.get('Origin') !== origin)
    ) {
      res.status(403).json({
        statusCode: 403,
        message: 'Origem da solicitação não permitida.',
        requestId: res.locals.requestId,
      });
      return;
    }
    const hasBody =
      Number(req.get('Content-Length') || '0') > 0 || Boolean(req.get('Transfer-Encoding'));
    const privateFileForm =
      req.method === 'POST' &&
      ['/api/candidates/me/resume', '/api/auth/register'].includes(req.path) &&
      req.is('multipart/form-data');
    if (hasBody && !req.is('application/json') && !privateFileForm) {
      res.status(415).json({
        statusCode: 415,
        message: 'Envie application/json.',
        requestId: res.locals.requestId,
      });
      return;
    }
    next();
  };
}
