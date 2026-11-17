import type { Request, Response, NextFunction } from 'express';
import { mutationProtection } from './security';

describe('proteção de mutações', () => {
  function invoke(
    method: string,
    headers: Record<string, string>,
    json = true,
    path = '',
    multipart = false,
  ) {
    const req = {
      method,
      path,
      get: (name: string) => headers[name],
      is: (type: string) => (type === 'application/json' ? json : multipart),
    } as unknown as Request;
    const res = {
      locals: { requestId: 'test-id' },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    mutationProtection('https://talentos.example.test')(req, res, next);
    return { res, next };
  }
  it('permite leitura pública', () => {
    expect(invoke('GET', {}).next).toHaveBeenCalled();
  });
  it('rejeita formulário sem header de aplicação', () => {
    expect(invoke('POST', {}).res.status).toHaveBeenCalledWith(403);
  });
  it('rejeita origem estrangeira mesmo com header válido', () => {
    expect(
      invoke('PATCH', { Origin: 'https://malicioso.example.test', 'X-Pointmedia-Request': '1' }).res
        .status,
    ).toHaveBeenCalledWith(403);
  });
  it('permite cliente CLI explícito sem Origin', () => {
    expect(invoke('POST', { 'X-Pointmedia-Request': '1' }).next).toHaveBeenCalled();
  });
  it('rejeita corpo não JSON', () => {
    expect(
      invoke('POST', { 'X-Pointmedia-Request': '1', 'Content-Length': '100' }, false).res.status,
    ).toHaveBeenCalledWith(415);
  });
  it('rejeita corpo chunked não JSON mesmo sem Content-Length', () => {
    expect(
      invoke('POST', { 'X-Pointmedia-Request': '1', 'Transfer-Encoding': 'chunked' }, false).res
        .status,
    ).toHaveBeenCalledWith(415);
  });
  it('permite JSON enviado com Transfer-Encoding', () => {
    expect(
      invoke('POST', { 'X-Pointmedia-Request': '1', 'Transfer-Encoding': 'chunked' }).next,
    ).toHaveBeenCalled();
  });
  it('permite multipart somente na inscrição e upload exatos com header explícito', () => {
    const headers = { 'X-Pointmedia-Request': '1', 'Content-Length': '100' };
    expect(
      invoke('POST', headers, false, '/api/candidates/me/resume', true).next,
    ).toHaveBeenCalled();
    expect(invoke('POST', headers, false, '/api/auth/register', true).next).toHaveBeenCalled();
    expect(
      invoke('PATCH', headers, false, '/api/auth/register', true).res.status,
    ).toHaveBeenCalledWith(415);
    expect(invoke('POST', headers, false, '/api/auth/login', true).res.status).toHaveBeenCalledWith(
      415,
    );
    expect(
      invoke('PUT', headers, false, '/api/candidates/me/resume', true).res.status,
    ).toHaveBeenCalledWith(415);
    expect(
      invoke('POST', { 'Content-Length': '100' }, false, '/api/candidates/me/resume', true).res
        .status,
    ).toHaveBeenCalledWith(403);
  });
});
