# Identidade visual — logos oficiais e Poppins

Em 29/10/2026, o usuário forneceu os dois PNGs oficiais e confirmou **Poppins** como fonte do sistema. Essa orientação substitui a referência tipográfica anterior a Fresno/DIN Pro/Freestyle Script. Originais em Imagens/ e documentos de instruções não foram alterados.

## Assets e uso

- `apps/web/public/brand/point-dark.png`: cópia idêntica de “Logotipo point em cores vibrantes.png”, letras pretas para fundos claros.
- `apps/web/public/brand/point-light.png`: cópia idêntica de “Logotipo point com formas coloridas.png”, letras brancas para fundos escuros.
- Ambos 1672×941, com transparência. O componente Brand exibe a área da marca dentro das margens transparentes por CSS, sem editar, redesenhar, recolorir ou distorcer os arquivos.
- Login, cadastro, sidebar e cabeçalho/hero/rodapé da Home usam a versão clara; cabeçalhos claros e comprovante usam a escura. Removida a reprodução provisória por círculos/triângulos CSS e texto.
- Poppins normal nos pesos 400, 500, 600, 700, 800 e 900, servida localmente em `apps/web/public/fonts/poppins`, com font-display swap, preload do peso regular e fallback Arial/sans-serif. Controles de formulário herdam a mesma família; pesos intermediários usam a face disponível correspondente, sem síntese artificial.

Fonte obtida do [repositório oficial Google Fonts](https://github.com/google/fonts/tree/main/ofl/poppins), com [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/poppins/OFL.txt) preservada em `public/fonts/poppins/OFL.txt`. Integridade dos seis arquivos conferida pelo SHA do blob informado pelo GitHub. Downloads diretos pelo shell estavam indisponíveis; os arquivos foram obtidos pelo conector GitHub, sem instalar dependências. Nenhuma requisição ao Google Fonts é feita pelo navegador dos usuários.

## Verificação

- Build/tipagem do frontend passou; 17 testes Vitest e 9 Playwright aprovados, incluindo os fluxos reais de conta, perfil, vagas, candidaturas e talentos.
- Chromium em 1440×1024 e 375×812: Home, login, cadastro e banco sem overflow horizontal, Poppins carregada de fato, logos decodificados e sem erros JavaScript ou requisições externas.
- Capturas inspecionadas em `.tmp/brand-home-1440.png`, `brand-home-375.png`, `brand-login-1440.png` e `brand-login-375.png`.
- Layout, campos, cores e regras funcionais preservados. Logos e fonte deixam de ser pendências; refinamento visual detalhado e acessibilidade continuam no plano.

Arquivos de código alterados: Brand, AccountLayout, login/cadastro, HomePage/home.css, global.css, jobs.css e index.html; assets locais e documentação de rastreabilidade. Sem commit ou publicação. A Fase 4 foi autorizada pelo usuário após esta aplicação.
