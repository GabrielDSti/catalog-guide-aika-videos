# Design: Guia de Iniciantes — galeria de vídeos do YouTube

- **Data:** 2026-10-05
- **Status:** aprovado
- **Contexto:** comunidade Ally Octans (Aika Online). Página estática, hospedada gratuitamente no GitHub Pages, que reúne vídeos do YouTube em formato de galeria pesquisável. Segue a identidade visual do site existente em `exemplo/` (https://aikaoctans.one/).

## 1. Objetivo

Uma página única onde qualquer visitante vê uma grade de vídeos do YouTube (thumbnail + título), pode buscar por título/canal em tempo real, e assiste ao vídeo embutido num lightbox sem sair da página. Apenas quem tem permissão de escrita no repositório GitHub consegue adicionar um vídeo novo — não existe conta de usuário, login ou senha no site.

## 2. Por que sem backend, sem login

GitHub Pages serve arquivos estáticos. Qualquer "senha de administrador" escrita em JavaScript fica visível no código-fonte para qualquer visitante — não é proteção real. A única barreira de escrita que existe de verdade nesse modelo de hospedagem é o controle de acesso do próprio GitHub (quem pode commitar no repositório).

Por isso o "usuário master" não é um conceito dentro do site: é literalmente quem tem acesso de push ao repositório. A lista de vídeos é um arquivo versionado; adicionar um vídeo é um commit.

## 3. Estrutura de arquivos

```
index.html              a galeria (página pública)
admin.html              ferramenta de cadastro local (gera o trecho a colar em videos.js; sem poder de escrita)
assets/
  style.css             identidade visual derivada de exemplo/
  app.js                render da grade, busca, lightbox
  lib.js                funções puras: extrair id do YouTube, normalizar texto p/ busca
  videos.js             window.VIDEOS = [...] — único arquivo editado para adicionar vídeo
  octans-emblema.jpg    reaproveitado de exemplo/
  favicon.svg
test.html               roda as asserções de lib.js no navegador (sem build/npm)
README.md               como publicar no GitHub Pages e como adicionar um vídeo
```

## 4. Formato de dado (`assets/videos.js`)

```js
window.VIDEOS = [
  {
    id: "dQw4w9WgXcQ",        // id de 11 caracteres do YouTube
    titulo: "Como começar em Aika Online",
    canal: "Ally Octans",
    adicionado: "2026-10-05"  // AAAA-MM-DD, usado só para ordenar
  },
];
```

Começa como `window.VIDEOS = [];` — lista vazia, sem vídeos de exemplo.

**Decisão — `.js` em vez de `.json`:** um `.json` exige `fetch`, que falha ao abrir `index.html` por duplo clique (sem servidor local). Um `.js` que atribui a uma global funciona tanto em `file://` quanto em qualquer hospedagem, então você vê o resultado antes mesmo de commitar.

**Decisão — thumbnail não é um campo salvo.** É derivada do `id` em tempo de render: `https://i.ytimg.com/vi/<id>/hqdefault.jpg` (existe para todo vídeo público; variantes maiores podem não existir e por isso não são usadas como primeira tentativa).

**Decisão — título é texto fixo, não buscado ao vivo.** Garante busca instantânea, funciona com o YouTube fora do ar, e permite um título mais claro que o original. Trade-off aceito: se o autor renomear no YouTube, não atualiza aqui sozinho.

A ordem no arquivo é irrelevante — a página sempre ordena por `adicionado` desc (mais recente primeiro); itens com mesma data mantêm a ordem do arquivo.

## 5. `index.html` — a galeria

**Visual:** mesma paleta/tipografia do `exemplo/style.css` — fundo `#080c10`, dourado `#d4b47d`, texto claro `#f4f0e8`, Cinzel nos títulos (via Google Fonts), Manrope no corpo. Header com emblema + "ALLY OCTANS · AIKA ONLINE · BRASIL" (reaproveita `octans-emblema.jpg`), rodapé discreto com "Comunidade independente de Aika Online."

**Diferença deliberada em relação à galeria do exemplo:** lá os cards são quadrados com o título sobreposto sobre a imagem. Thumbnail de YouTube é 16:9 e título pode ser longo — sobrepor ficaria ilegível e o título é o que a busca usa, então aqui **o título fica abaixo da thumbnail**, não por cima.

**Grade:** 3 colunas (desktop) / 2 (tablet) / 1 (celular). Cada card: thumbnail 16:9 com selo de play dourado centralizado (visível sempre no celular, no hover em telas com mouse), título em até 2 linhas, nome do canal em menor destaque.

**Busca:** campo de texto acima da grade, filtra a cada tecla digitada por `titulo` e `canal`, normalizando acento e caixa (buscar "dungeao" encontra "Dungeão"). Mostra contagem de resultados. Estados:
- lista vazia (nenhum vídeo cadastrado ainda): mensagem convidando a voltar depois.
- busca sem resultado: mensagem nomeando o termo buscado.

**Reprodução:** clique no card abre um `<dialog>` (mesma mecânica do lightbox em `exemplo/script.js.download`: `showModal()`, fecha com Esc ou clique fora, foco retorna ao card que abriu). O iframe do player só é criado no momento do clique, usando `https://www.youtube-nocookie.com/embed/<id>?autoplay=1`, para não pesar o carregamento inicial da página nem carregar cookies de rastreio antes do clique.

**Acessibilidade/robustez (herdadas do exemplo):** skip link, `:focus-visible` com contorno dourado, `prefers-reduced-motion` respeitado (sem animação de hover em quem pediu menos movimento), alvos de toque ≥44px.

## 6. `admin.html` — ferramenta de cadastro

Página separada, sem link nenhum a partir de `index.html` (não faz parte da navegação pública, mas também não é secreta — está no mesmo repositório público). Fluxo:

1. Você cola um ou mais links do YouTube (aceita `watch?v=`, `youtu.be/`, `/shorts/`, com parâmetros extras como `&t=`).
2. Para cada link, extrai o `id` com as funções de `lib.js` e busca o título automaticamente via oEmbed do YouTube (`https://www.youtube.com/oembed?url=...&format=json`, não exige chave de API).
3. Mostra uma pré-visualização (thumbnail + título + canal) com o título editável, para o caso de querer corrigir ou a busca automática falhar.
4. Botão final gera o texto completo de `assets/videos.js` (mesclando os vídeos já existentes, que você cola de volta, com os novos) e copia para a área de transferência.

A ferramenta **não escreve em lugar nenhum** — só gera texto na tela. Colar esse texto em `assets/videos.js` e commitar é o passo que você faz pelo GitHub (web ou git local). Por não ter poder de escrita, não precisa (e não deve) ter senha.

## 7. `lib.js` — funções puras e testadas

- `extractYouTubeId(url)` → retorna o id de 11 caracteres ou `null` se o link não for reconhecido. Cobre os formatos: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, com querystring extra.
- `normalizeForSearch(text)` → minúsculas + remove acentos (NFD), para comparação de busca.

`test.html` carrega `lib.js` e roda asserções simples (sem framework, sem npm) exibindo PASS/FAIL na própria página — cobre os formatos de link válidos, um link inválido, e normalização com acento/caixa mista.

## 8. Publicação

1. Repositório público no GitHub.
2. Settings → Pages → Deploy from branch → `main` / `/ (root)`.
3. Fica disponível em `https://<usuario>.github.io/<repo>/`.
4. Opcional, documentado no README: apontar um domínio próprio (ex. `guia.aikaoctans.one`) via arquivo `CNAME`.

## 9. Como adicionar um vídeo (fluxo do dia a dia)

Documentado no `README.md`:

1. Abra `admin.html` localmente (duplo clique).
2. Cole o(s) link(s) do YouTube, confira/edite o título.
3. Copie o `videos.js` gerado.
4. No GitHub (web: editar arquivo direto no repositório, ou local: editar + `git commit` + `git push`), substitua o conteúdo de `assets/videos.js`.
5. GitHub Pages republica automaticamente em ~1 minuto.

## 10. Fora de escopo (YAGNI)

- Categorias/tags, seções de guia — rejeitado nesta rodada (decisão do usuário: lista única + busca).
- Abrir vídeo em nova aba no YouTube — rejeitado (decisão do usuário: tocar na própria página).
- Qualquer login/senha no site, GitHub Action para issues, backend ou serviço externo pago.
