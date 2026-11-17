import { sampleDocx, samplePdf } from '../../test/resume-fixtures';
import { MAX_RESUME_SIZE, validateResume } from './resume-validation';

const docxType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const file = (buffer: Buffer, originalname = 'curriculo.docx', mimetype = docxType) => ({
  buffer,
  size: buffer.length,
  originalname,
  mimetype,
});
describe('validação dos currículos', () => {
  it('aceita PDF com assinatura/fim e sanitiza o nome original', () => {
    expect(
      validateResume(file(samplePdf, '../../curriculo.pdf', 'application/pdf')).originalName,
    ).toBe('curriculo.pdf');
    expect(
      validateResume(
        file(samplePdf, Buffer.from('currículo.pdf', 'utf8').toString('latin1'), 'application/pdf'),
      ).originalName,
    ).toBe('currículo.pdf');
    expect(validateResume(file(samplePdf, 'currículo.pdf', 'application/pdf')).originalName).toBe(
      'currículo.pdf',
    );
  });
  it.each([0, 8])('aceita documento Open XML em ZIP com método %s', (method) => {
    expect(validateResume(file(sampleDocx({}, method))).mimeType).toBe(docxType);
    const document =
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Experiência com VBAProject e ActiveX.</w:t></w:r></w:p></w:body></w:document>';
    expect(
      validateResume(file(sampleDocx({ 'word/document.xml': document }, method))).mimeType,
    ).toBe(docxType);
  });
  it('rejeita arquivo sem assinatura, MIME divergente e ZIP falso', () => {
    expect(() => validateResume(file(Buffer.from('PK fake')))).toThrow();
    expect(() => validateResume(file(samplePdf, 'curriculo.pdf', docxType))).toThrow();
    expect(() =>
      validateResume(file(Buffer.from('%PDF-1.7\nsem fim'), 'cv.pdf', 'application/pdf')),
    ).toThrow();
  });
  it('rejeita arquivo ausente ou acima do limite', () => {
    expect(() => validateResume(undefined)).toThrow();
    expect(() => validateResume(file(Buffer.alloc(MAX_RESUME_SIZE + 1)))).toThrow();
  });
  it('rejeita macros, conteúdo incorporado e caminhos de travessia', () => {
    for (const name of ['word/vbaProject.bin', 'word/embeddings/object.bin', '../evil.xml'])
      expect(() => validateResume(file(sampleDocx({ [name]: 'payload' })))).toThrow();
  });
  it('rejeita XML com entidades externas e pacote sem a parte principal', () => {
    expect(() =>
      validateResume(
        file(
          sampleDocx({
            'word/document.xml': '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///secret">]><x/>',
          }),
        ),
      ),
    ).toThrow();
    expect(() => validateResume(file(sampleDocx({ '[Content_Types].xml': '<Types/>' })))).toThrow();
  });
  it('rejeita expansão desproporcional, truncamento e corrupção de CRC', () => {
    expect(() =>
      validateResume(file(sampleDocx({ 'word/large.xml': 'a'.repeat(300000) }))),
    ).toThrow();
    const truncated = sampleDocx().subarray(0, -10);
    expect(() => validateResume(file(truncated))).toThrow();
    const corrupt = sampleDocx({}, 0);
    corrupt[50] = (corrupt[50] ?? 0) ^ 1;
    expect(() => validateResume(file(corrupt))).toThrow();
  });
});
