# Guia de Iniciantes — Ally Octans

Galeria de vídeos do YouTube para quem está começando em Aika Online. Site estático, hospedado de graça no GitHub Pages — sem backend, sem banco de dados, sem login.

## Como funciona

A lista de vídeos vive em `assets/videos.js`. A página (`index.html`) lê esse arquivo no navegador e monta a grade com thumbnail, título e busca. Qualquer visitante pode ver e buscar os vídeos; só quem tem permissão de escrita neste repositório consegue adicionar um vídeo novo (é um commit, não uma senha no site).

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub e envie estes arquivos para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Deploy from a branch** → selecione `main` e a pasta `/ (root)`.
3. Em cerca de 1 minuto o site fica disponível em `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.
4. (Opcional) Para usar um domínio próprio, crie um arquivo `CNAME` na raiz com o domínio desejado e configure o DNS do domínio para apontar para o GitHub Pages.

## Como adicionar um vídeo

1. Abra `admin.html` no seu navegador (duplo clique no arquivo funciona, não precisa de servidor).
2. Cole um ou mais links do YouTube na primeira caixa (um por linha) e clique em **Processar links**.
3. Confira o título e o canal que foram buscados automaticamente para cada vídeo; edite se quiser um título mais claro, ou remova o que não quiser adicionar.
4. Abra o arquivo `assets/videos.js` deste repositório (pelo GitHub, direto no navegador) e cole o conteúdo dele na caixa **"3. Vídeos já existentes"** do `admin.html`.
5. Clique em **Gerar videos.js** e depois em **Copiar**.
6. Volte para `assets/videos.js` no GitHub, substitua todo o conteúdo pelo texto copiado, e comite ("Commit changes…").
7. Em cerca de 1 minuto o GitHub Pages republica o site com o vídeo novo.

`admin.html` não salva nada em lugar nenhum — ele só gera o texto que você cola manualmente. Por isso não tem (e não precisa de) senha.

## Testes

Abra `test.html` no navegador para rodar as verificações automáticas das funções em `assets/lib.js` (extração de id do YouTube, busca sem acento, ordenação, geração/leitura do `videos.js`). O resumo no topo da página mostra quantos testes passaram.

## Estrutura de arquivos

```
index.html       galeria pública
admin.html       ferramenta local para gerar o conteúdo de videos.js
assets/
  style.css      estilo (paleta e tipografia da Ally Octans)
  lib.js         funções puras: extrair id do YouTube, busca, ordenação, geração/leitura de videos.js
  app.js         monta a grade, busca e o player em destaque (lightbox) de index.html
  admin.js       lógica de admin.html
  videos.js      a lista de vídeos — o único arquivo que você edita para adicionar um vídeo
  octans-emblema.jpg
  favicon.svg
test.html        roda os testes de lib.js no navegador
```
