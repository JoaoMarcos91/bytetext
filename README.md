# ByteTexto

Conversor de arquivos para Base64, hexadecimal ou binário, com compactação opcional por GZIP. Funciona diretamente no navegador, sem upload de arquivos, servidor de processamento ou dependências externas.

## Funcionalidades

- Escolher ou arrastar um arquivo para codificar.
- Converter para Base64, hexadecimal ou binário.
- Compactar automaticamente com GZIP antes de converter, **somente quando isso diminui o número final de caracteres**.
- Mostrar a economia de caracteres obtida.
- Copiar todo o texto codificado.
- Colar o texto para recuperar os bytes originais e baixar o arquivo.
- Reconhecer e descompactar GZIP automaticamente quando o texto contiver a identificação do ByteTexto.
- Preservar opcionalmente nome, extensão e tipo do arquivo.

## Como usar

### Codificar

1. Abra a aba **Codificar** e selecione um arquivo.
2. Escolha o formato desejado.
3. Deixe **Compactar automaticamente (GZIP)** ativado para tentar reduzir o texto.
4. Deixe **Preservar nome e extensão** ativado se quiser recuperá-los automaticamente.
5. Clique em **Copiar texto** e salve o conteúdo em um lugar que preserve os caracteres.

A opção de compactação não força um arquivo maior: caso o GZIP não ofereça economia, o ByteTexto mantém os dados originais sem compactação. Arquivos JPEG, MP4, PDF e ZIP frequentemente já usam técnicas de compressão, por isso nem sempre ficam menores.

### Decodificar

1. Abra a aba **Decodificar** e cole o conteúdo completo.
2. O formato, a compactação e o nome são identificados automaticamente quando existe o cabeçalho.
3. Se não existir cabeçalho, selecione o formato correto e informe o nome do arquivo.
4. Clique em **Baixar arquivo**.

**Compatibilidade:** o site continua lendo os conteúdos da versão anterior (`BYTETEXTO/1`) e formatos puros, sem cabeçalho. Quando um arquivo é compactado, o ByteTexto inclui o pequeno cabeçalho `BYTETEXTO/2` mesmo que a opção de preservar o nome esteja desativada, porque essa informação é indispensável para a descompactação automática. Não remova nem altere essa linha.

## Publicar no GitHub e Vercel

1. Crie ou abra um repositório no GitHub.
2. Em **Add file → Upload files**, envie os arquivos de dentro da pasta `byte-texto` para a raiz do repositório; salve com **Commit changes**.
3. No Vercel, importe o repositório em **New Project**.
4. Se necessário, selecione **Framework Preset: Other** e faça o deploy. Nenhum comando de build ou variável de ambiente é necessário.

O projeto também pode ser aberto localmente a partir de `index.html`.

## Estrutura

- `index.html` — interface.
- `styles.css` — estilos.
- `codec.js` — conversão, cabeçalhos e GZIP.
- `app.js` — manipulação dos arquivos, cópia e download.

## Observações

- Os dados são processados localmente, sem envio a servidores pelo ByteTexto.
- GZIP requer um navegador com `CompressionStream` e `DecompressionStream`. Em navegadores sem suporte, o site converte sem compactar.
- Base64 aumenta o tamanho dos bytes em cerca de 33% antes de considerar o efeito da compactação e do cabeçalho; hexadecimal duplica e binário textual multiplica por oito.
- A compactação não substitui o limite de caracteres imposto por outro site. Verifique se o texto foi salvo e recuperado integralmente.
- A codificação e a compactação não são criptografia: qualquer pessoa com o texto pode reconstruir o arquivo.
- Arquivos muito grandes podem ocupar bastante memória durante a conversão e a descompactação.
