# ByteTexto

Conversor de arquivos para texto. Funciona totalmente no navegador, sem upload de arquivos e sem bibliotecas externas.

## Formatos

- **Base64:** texto cerca de 33% maior do que o arquivo original.
- **Hexadecimal:** dois caracteres por byte (aproximadamente o dobro do tamanho).
- **Binário:** oito caracteres `0` ou `1` por byte (aproximadamente oito vezes o tamanho).

## Como usar

### Codificar

1. Abra o site e selecione **Codificar**.
2. Arraste um arquivo ou clique em **Escolher arquivo**.
3. Selecione Base64, hexadecimal ou binário.
4. Use **Copiar texto** e cole o resultado onde quiser.

A opção **Preservar nome e extensão** insere uma linha inicial de identificação. É recomendável deixá-la ativada se o texto será reconstruído neste site. Desative-a caso queira apenas Base64, hexadecimal ou binário sem cabeçalho.

### Decodificar

1. Selecione **Decodificar** e cole o texto.
2. Se houver cabeçalho, o formato e o nome do arquivo são identificados automaticamente.
3. Sem cabeçalho, selecione o formato correto e informe o nome do arquivo com a extensão desejada.
4. Clique em **Baixar arquivo**.

Os bytes são preservados. Sem cabeçalho, o nome original e o tipo MIME não podem ser deduzidos apenas a partir do conteúdo codificado.

## Publicar no Vercel

1. Crie um repositório no GitHub e envie os arquivos da pasta deste projeto para a raiz do repositório.
2. No Vercel, escolha **Add New → Project** e importe o repositório.
3. Se necessário, selecione **Framework Preset: Other**.
4. Não é necessário instalar dependências, definir comando de build ou configurar variáveis de ambiente.
5. Publique o projeto.

Também pode ser aberto diretamente pelo arquivo `index.html` no computador.

## Estrutura

- `index.html` — estrutura das telas
- `styles.css` — tema claro e layout responsivo
- `codec.js` — conversão de bytes e cabeçalho opcional
- `app.js` — interação com os arquivos, copiar e baixar

## Observações

- Os dados não são enviados para um servidor pelo projeto.
- Não há armazenamento automático de conteúdo no site; copie o texto para o local desejado.
- Arquivos grandes podem ocupar muita memória no navegador, principalmente na codificação binária.
- Ao usar uma área de texto de outro site, verifique os limites, as regras e se o conteúdo permanece intacto após ser salvo.
- A codificação não é criptografia: quem tiver acesso ao texto poderá recuperar o arquivo.
