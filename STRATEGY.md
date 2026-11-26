# lista-livre Strategy

## Vision

<!-- vision: rascunho do agente orq-lista-livre em 2026-11-26, aguardando aprovação do autor -->

`lista-livre` existe para que um professor monte, em minutos, uma lista de exercícios imprimível com questões reais do ENEM, sem conta, sem chave de API e sem pagar nada.
Ele serve o professor que prepara aula e prova, no computador da escola ou no celular.
Ele transforma uma busca por enunciado, ano, área e hashtag em uma folha A4 com cabeçalho da turma e gabarito opcional.
Ele tem uma única coisa sua: o editor de listas sobre um acervo de questões reais com procedência registrada.

### Questão real, procedência explícita

Toda questão do acervo vem de uma prova real, importada de fonte documentada em `docs/SOURCES.md`, com data de coleta no manifesto.
Nenhum texto de questão é gerado ou reescrito por IA.
O que é metadado da fonte (ano, área, idioma, gabarito) fica separado do que é sugestão editorial (hashtags por palavra-chave), e a sugestão nunca é atribuída ao INEP.
Problemas conhecidos da fonte aparecem para o professor como aviso; o app não esconde nem corrige em silêncio.
Uma nova fonte só entra com esquema, procedência, deduplicação e condições de uso documentados.
A licença MIT cobre o código; o acervo importado mantém a licença e a atribuição de origem e não é redistribuído no repositório.

### Local primeiro, sem dependência

O app roda com Node, npm e um SQLite local: sem conta, sem chave de API, sem Docker e sem banco externo.
A busca funciona sobre o snapshot local; a disponibilidade da API de origem não afeta o uso diário.
A importação é reproduzível, respeita os limites do provedor e só publica o snapshot depois de validar IDs únicos.
Por padrão o servidor escuta só em `127.0.0.1`; expor na rede é uma escolha explícita por variável de ambiente.

### A folha impressa é o produto

Uma mudança é julgada pelo que sai na folha: título, escola, professor, turma, instruções, questões legíveis e gabarito em página separada.
A impressão espera as figuras e avisa quando alguma não carregou.
Teclado, celular (390 px) e impressão continuam funcionando em toda mudança de interface; arrastar tem sempre um equivalente por botão.
O texto da interface diz a verdade sobre onde os dados ficam (PR #3: "salva no servidor", não "neste computador").

### Demo pública isolada, não multiusuário

A demo pública (`DEMO_MODE=1`) isola listas por visitante anônimo com cookie assinado, limita escrita por IP, limita listas por visitante e apaga listas ociosas.
Ela é vitrine, não serviço: não promete guardar as listas de ninguém.
Com o modo demo desligado, o comportamento de usuário único não muda.
Abrir a API é feito rota a rota e com teste dos dois lados: só `GET /api/health` tem CORS (PR #2).
Virar serviço multiusuário de verdade exige autenticação, autorização por lista, backup e estratégia de imagens antes de qualquer feature que dependa disso.

### Prova antes de afirmação

Testes usam questões sintéticas próprias e rodam sem acessar o acervo externo; a CI roda testes, build e formatação.
Mudança de fluxo de lista passa pelo teste de navegador, e correção vinda de smoke test traz a medição de antes e depois.
PRs são focados e descrevem problema, comportamento e verificação.
Nenhum merge na `main` acontece sem o OK do autor; o agente decide sozinho o que é técnico e reversível, sempre em branch.

### Escopo

O lista-livre não é um banco de questões autoral, não é um gerador de questões por IA, não é um LMS, não aplica nem corrige prova online e não é uma plataforma com contas.
Listas pessoais, bancos SQLite, `.env` e o snapshot de provas ficam fora do Git.
Ele não é afiliado ao INEP nem ao MEC, e não se apresenta como classificação pedagógica oficial.

Uma mudança se alinha quando melhora achar questões reais, montar a lista ou imprimir a folha, mantém o app rodando localmente sem conta nem chave, preserva a procedência e vem com teste e verificação.
Uma mudança deve ser resistida quando gera ou altera texto de questão, mistura sugestão editorial com dado da fonte, exige conta, serviço pago ou rede para o uso diário, quebra teclado, celular ou impressão, ou transforma a demo em serviço sem autenticação e backup.

## Hipotéticos

Rascunho do agente, sem resposta do autor.
Cada um fecha com o veredito recomendado e o melhor motivo; o autor pode inverter qualquer um, e o texto da Vision muda junto.

### H1 - Classificar assuntos com um LLM

Proposta: trocar as hashtags por palavra-chave por uma classificação feita por LLM na importação, muito mais precisa.
Testa: "Nenhum texto de questão é gerado ou reescrito por IA" e "sugestão editorial nunca é atribuída ao INEP".
A favor: falsos positivos das regras atuais atrapalham a busca; o LLM não altera o enunciado, só rotula.
Contra: exige chave de API na importação, deixa de ser reproduzível e legível como as regras em `import-data.mjs`.
**Veredito recomendado: aceitar como etapa opcional, rotulada como sugestão, com o resultado versionado; resistir como passo obrigatório da importação.**
Motivo: a regra proíbe IA no texto, não no rótulo, mas "sem chave de API" é promessa de primeira linha do README.

### H2 - Gerar questões inéditas "no estilo ENEM"

Proposta: um botão que gera variações de uma questão para o professor ter mais opções na lista.
Testa: "Toda questão do acervo vem de uma prova real".
A favor: é o pedido mais provável de professor e um diferencial forte.
Contra: o valor do acervo é ser real; variação gerada sem revisão vai para a folha impressa com cara de ENEM.
**Veredito recomendado: resistir.**
Motivo: o projeto se define por questão real com procedência; misturar gerado e real destrói a confiança na folha.

### H3 - Contas de professor com login Google

Proposta: login para o professor ver suas listas em qualquer dispositivo.
Testa: "sem conta" e "Demo pública isolada, não multiusuário".
A favor: a nota da demo hoje é que outro navegador não vê as listas; é o limite mais sentido no uso real.
Contra: traz autenticação, autorização, backup e dados pessoais, e muda a natureza do projeto de ferramenta local para serviço.
**Veredito recomendado: resistir por agora; aceitar primeiro exportar e importar lista em arquivo.**
Motivo: exportar resolve "levar a lista para outro lugar" sem conta, e o README já lista isso como próxima melhoria.

### H4 - Imagens das questões baixadas e servidas localmente

Proposta: o importador baixa as figuras e o app deixa de depender da origem.
Testa: "a disponibilidade da API de origem não afeta o uso diário" e a licença do acervo.
A favor: imprimir sem internet e sem imagem quebrada; o README cita como melhoria.
Contra: aumenta o snapshot e redistribui obras de terceiros embutidas nas questões, cujos direitos não foram revisados.
**Veredito recomendado: aceitar no snapshot local, fora do Git e fora de imagens Docker públicas.**
Motivo: local primeiro pede isso, e o cuidado de licença já é o mesmo aplicado a `questions.json`.

### H5 - Publicar a imagem Docker com o acervo num registry público

Proposta: publicar a imagem pronta, com as 2.722 questões, para qualquer um subir em um comando.
Testa: "o acervo importado ... não é redistribuído no repositório".
A favor: instalação trivial, mais adoção por escolas.
Contra: a imagem embute conteúdo GPL-2.0/INEP; o PR #1 já registrou para não publicar sem checar.
**Veredito recomendado: resistir; publicar só a imagem sem acervo, que importa na primeira execução.**
Motivo: a facilidade não compensa redistribuir conteúdo de terceiros sem revisão de direitos.

### H6 - Outras provas além do ENEM (vestibulares, OBMEP)

Proposta: importar Fuvest, Unicamp e OBMEP para ampliar o acervo.
Testa: "Uma nova fonte só entra com esquema, procedência, deduplicação e condições de uso documentados" e a identidade "questões reais do ENEM".
A favor: o professor de ensino médio usa essas provas; o README cita novas fontes.
Contra: essas provas raramente têm API estruturada; extrair de PDF exige revisão editorial e o acervo pode perder qualidade.
**Veredito recomendado: aceitar fonte a fonte, só com dado estruturado e procedência documentada; resistir a extração automática de PDF sem revisão.**
Motivo: a identidade é "questão real com procedência", não "só ENEM"; o limite é a qualidade, não o nome da prova.

### H7 - Corrigir em silêncio os erros de transcrição da fonte

Proposta: um arquivo de correções aplicado na importação para consertar fórmulas e alternativas erradas.
Testa: "Problemas conhecidos da fonte aparecem para o professor como aviso; o app não esconde nem corrige em silêncio".
A favor: o professor quer a questão certa, não um aviso.
Contra: a correção vira conteúdo editorial próprio, que diverge da fonte e pode estar errada.
**Veredito recomendado: aceitar correções versionadas, revisáveis e marcadas na questão como "corrigida pelo lista-livre"; resistir à correção invisível.**
Motivo: o problema não é corrigir, é esconder a origem da mudança.

### H8 - Aplicar a lista online e corrigir automaticamente

Proposta: gerar um link para os alunos responderem e o professor receber a nota.
Testa: "não aplica nem corrige prova online" e "A folha impressa é o produto".
A favor: o gabarito estruturado torna a correção trivial; é o passo seguinte natural.
Contra: traz alunos, contas, dados de menores e anti-fraude; vira um LMS.
**Veredito recomendado: resistir.**
Motivo: o escopo é preparar a folha; aplicação online é outro produto com outro risco.

### H9 - Analytics na demo pública

Proposta: medir buscas e listas criadas na demo para orientar o produto.
Testa: "Ela é vitrine, não serviço" e o cuidado com dados dos visitantes.
A favor: sem dado, a priorização é chute; buscas mostram que assuntos faltam.
Contra: script de terceiro traz cookie e rastreamento a uma ferramenta que hoje não coleta nada.
**Veredito recomendado: aceitar só contagem agregada no próprio servidor, sem script de terceiros e sem identificar o visitante.**
Motivo: dá o sinal útil (o que se busca) sem trocar a privacidade que o projeto oferece de graça.

### H10 - Exportar para Word/Google Docs em vez de só imprimir

Proposta: exportar a lista como .docx para o professor editar antes de imprimir.
Testa: "A folha impressa é o produto" e "sem dependência".
A favor: professor edita tudo em Word; o PDF não deixa ajustar.
Contra: fidelidade de fórmulas, imagens e Markdown em .docx é difícil e mais uma superfície para manter.
**Veredito recomendado: aceitar exportação .docx gerada localmente, sem serviço externo; resistir a integração com Google Drive.**
Motivo: ajustar a folha é parte do produto, mas integração com conta Google reabre o debate de contas do H3.

### H11 - Trocar SQLite por Postgres para preparar escala

Proposta: migrar para Postgres para suportar muitas escolas na demo.
Testa: "O app roda com Node, npm e um SQLite local ... sem banco externo".
A favor: concorrência e backups mais robustos se a demo crescer.
Contra: quebra a instalação em um comando e a demo hoje usa ~43 MiB de RAM.
**Veredito recomendado: resistir.**
Motivo: escala é problema hipotético; instalar sem banco externo é promessa real do README.

### H12 - Auto-merge de PRs verdes do agente

Proposta: PRs do agente com CI verde e smoke test ok entram na `main` sozinhos.
Testa: "Nenhum merge na `main` acontece sem o OK do autor".
A favor: os PRs são pequenos e bem testados; o autor vira gargalo.
Contra: a `main` é o que vai para produção na VPS; o autor quer ver cada mudança.
**Veredito recomendado: resistir.**
Motivo: regra fixa do autor; o agente acelera tudo até o PR, e o merge segue humano.
