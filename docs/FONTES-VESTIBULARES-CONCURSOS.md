# Vestibulares e concursos: fontes, direitos e plano

Status: proposta, aguardando decisão do autor. Pesquisa feita em 2026-11-26. Nada foi importado para o acervo.

## Resumo

- **Nenhuma** das oito fontes levantadas declara licença aberta para as provas. Pela Lei 9.610/1998, art. 29, reproduzir obra depende de autorização prévia e expressa. Sem licença, vale "todos os direitos reservados", mesmo quando o PDF é baixado de graça.
- **Nenhuma prova é domínio público.** O que fica fora da proteção é o **fato**: qual alternativa é a certa, número da questão, matéria, ano, link. Isso a gente pode registrar e citar.
- **Concursos (Cebraspe, FGV, FCC, Vunesp): ficam fora.** São entidades privadas. O Cebraspe declara por escrito que é dono dos direitos patrimoniais sobre o que produz.
- **Texto de vestibulares (Fuvest, Unicamp, UERJ, UFRGS): fica fora até haver autorização por escrito.** A Comvest e a UERJ declaram "todos os direitos reservados". A UFRGS vende os cadernos de vários anos.
- **Fonte segura para a prova de conceito: o gabarito oficial da UFRGS.** Ele é publicado em HTML estruturado. O importador grava só fatos e procedência: número, matéria, letra, anulada, link do gabarito, link e SHA-256 dos cadernos oficiais. **Nenhum enunciado é copiado.**

## Base legal usada

| Ponto            | Lei 9.610/1998                                            | Efeito no projeto                                                                                                                |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Obra protegida   | art. 7º                                                   | Enunciado e alternativas são criação intelectual da banca.                                                                       |
| Fora da proteção | art. 8º (ideias, informações de uso comum, atos oficiais) | O gabarito é fato, então entra. Não contamos com a tese de que a questão é um "ato oficial": é discutível e não está pacificada. |
| Autorização      | art. 29                                                   | Copiar o texto exige autorização expressa do titular.                                                                            |
| Citação          | art. 46, III                                              | Permite trechos para estudo, crítica ou polêmica, "na medida justificada". Não cobre republicar provas inteiras num acervo.      |
| Domínio público  | arts. 41 e 45                                             | Vale 70 anos após a morte do autor. Nenhuma prova recente se enquadra.                                                           |

**Textos de terceiros dentro das questões.** As provas citam trechos de livros, jornais, letras e imagens. Exemplo: a questão 1 do 1º dia da UFRGS 2024 usa um texto de M. H. Moura Neves (Editora da Unesp, 2018). A banca usa esses trechos amparada no art. 46, III. Mesmo que a banca autorize, os direitos do trecho continuam sendo do autor original. Qualquer transcrição futura precisa conservar o crédito exatamente como aparece no caderno e marcar o trecho como `thirdPartyExcerpt`.

Isto é uma análise de risco feita por engenharia, não um parecer jurídico.

## Levantamento por fonte

| Fonte                  | Natureza                                      | Onde estão as provas                                                                                                                   | Formato                                                        | Gabarito oficial                                                 | Licença e termos encontrados                                                                                                                                                                                                        | Risco do texto | Decisão                                                                              |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| **Fuvest** (USP)       | Fundação de direito privado ligada à USP      | [fuvest.br/acervo-vestibular](https://www.fuvest.br/acervo-vestibular/), de 1977 a 2026                                                | Cadernos em PDF, por fase                                      | PDF da 1ª fase; respostas esperadas da 2ª                        | A página do acervo não traz aviso de licença nem de reprodução. Sem licença, nada está liberado.                                                                                                                                    | Médio          | Fora do texto. Pode entrar no índice de gabarito depois que o formato for conferido. |
| **Unicamp** (Comvest)  | Órgão da Unicamp, autarquia estadual          | [comvest.unicamp.br](https://www.comvest.unicamp.br/): 2020 a 2027 na página da edição, anos anteriores no acervo                      | PDF da 1ª fase por versão; 2ª fase por área                    | Gabarito de cada versão da 1ª fase; respostas esperadas da 2ª    | Rodapé: "© 2026 COMVEST. Todos os Direitos Reservados."                                                                                                                                                                             | Alto           | Fora do texto. Índice possível.                                                      |
| **UERJ** (DSEA)        | Autarquia estadual                            | [vestibular.uerj.br](https://www.vestibular.uerj.br/), ex.: `sistema.vestibular.uerj.br/.../2019_2eq_prova.pdf`                        | PDF do Exame de Qualificação (60 objetivas) e do Discursivo    | Gabarito do EQ; padrão de respostas do Discursivo                | Rodapé: "Copyright © 2026 Portal UERJ".                                                                                                                                                                                             | Alto           | Fora do texto. Índice possível.                                                      |
| **UFRGS** (COPERSE)    | Autarquia federal                             | [ufrgs.br/coperse](https://www.ufrgs.br/coperse/concurso-vestibular-anteriores/). Download gratuito de 2013 a 2016, 2020 e 2022 a 2024 | Cadernos em PDF por dia, com o 2º dia em uma versão por idioma | **HTML estruturado** em `vestibular.ufrgs.br/cv<ano>/gabaritos/` | As páginas não trazem aviso de licença. Os [conjuntos de provas](https://www.ufrgs.br/coperse/aquisicao-de-provas/) de outros anos são vendidos (R$ 10 a 25). As provas comentadas dizem "Direitos reservados desta edição: UFRGS". | Médio          | **Prova de conceito: só gabarito e procedência.** Texto só com autorização.          |
| **Cebraspe**           | Associação civil privada (organização social) | `cdn.cebraspe.org.br/concursos/<SIGLA>/arquivos/`                                                                                      | PDF por cargo; itens de certo ou errado                        | Preliminar e definitivo, em PDF                                  | [Código de Ética](https://cdn.cebraspe.org.br/wp-content/uploads/2023/02/Codigo-de-Etica-e-Conduta-do-Cebraspe.pdf): os direitos patrimoniais da Lei 9.610 são do Cebraspe. Rodapé: "© 2019, Cebraspe."                             | **Alto**       | **Fora.**                                                                            |
| **FGV** (Conhecimento) | Fundação privada                              | `conhecimento.fgv.br/sites/default/files/concursos/*.pdf`                                                                              | PDF por tipo de prova                                          | PDF                                                              | Nenhuma licença encontrada nos cadernos nem no site.                                                                                                                                                                                | **Alto**       | **Fora.**                                                                            |
| **FCC**                | Fundação privada                              | [concursosfcc.com.br](https://www.concursosfcc.com.br/)                                                                                | PDF por cargo                                                  | PDF                                                              | Nenhuma licença encontrada; não achamos página pública de termos.                                                                                                                                                                   | **Alto**       | **Fora.**                                                                            |
| **Vunesp**             | Fundação de direito privado ligada à Unesp    | [vunesp.com.br](https://www.vunesp.com.br/)                                                                                            | PDF por cargo                                                  | PDF                                                              | Nenhuma licença encontrada; não achamos página pública de termos.                                                                                                                                                                   | **Alto**       | **Fora.**                                                                            |

Observações:

- Sites como QConcursos, Gran e Estratégia republicam essas provas. Isso **não é evidência de permissão**: podem existir contratos que não conhecemos, e eles não servem de fonte primária. Nunca importar a partir de agregadores.
- Não achamos página de termos de uso da FCC e da Vunesp. A conclusão "fora" vem da ausência de licença somada à natureza privada, não de uma proibição que tenhamos lido. Se alguma dessas bancas publicar uma licença, refazemos a análise.
- O ENEM continua como está, com a ressalva já registrada em `docs/SOURCES.md`.

## Modelo de dados de procedência

A ideia é estender o registro de questão sem quebrar o ENEM. O que vem da fonte fica separado do que é sugestão editorial.

```jsonc
{
  "id": "ufrgs-cv-2024-matematica-46", // <fonte>-<edição>-<matéria>-<número>; estável
  "source": "ufrgs-cv", // chave documentada neste arquivo
  "exam": {
    "kind": "vestibular", // "enem" | "vestibular" | "concurso"
    "banca": "COPERSE/UFRGS", // quem elaborou a prova
    "orgao": "Universidade Federal do Rio Grande do Sul", // quem contratou ou realizou o certame
    "nome": "Concurso Vestibular UFRGS",
    "edicao": 2024, // ano da edição, como a fonte chama
    "aplicacao": null, // data de aplicação, quando a fonte informar
    "fase": null,
    "caderno": null, // tipo, cor ou versão do caderno
    "curso": null, // vestibular específico de curso, se houver
    "cargo": null,
    "nivel": null, // concursos: cargo e escolaridade
  },
  "number": 46,
  "subject": "Matemática", // nome da matéria exatamente como a fonte usa
  "answer": { "letter": null, "annulled": true, "kind": "definitivo" },
  "text": null, // só com autorização; ver "status"
  "status": "somente-gabarito", // | "texto-pendente-revisao" | "revisado"
  "provenance": {
    "gabaritoUrl": "https://vestibular.ufrgs.br/cv2024/gabaritos/",
    "cadernoUrls": [
      "https://www.ufrgs.br/coperse/wp-content/uploads/2023/12/1o-DIA-PROVA-2024.pdf",
    ],
    "sha256": { "<url>": "<hash do PDF consultado>" },
    "retrievedAt": "2026-11-27T01:30:50.809Z",
    "method": "parse-html-gabarito-oficial", // como o dado foi obtido
  },
  "rights": {
    "basis": "fato", // "fato" | "licenca:<id>" | "autorizacao:<referência do documento>"
    "thirdPartyExcerpts": [], // { credito, tipo } copiados exatamente do caderno
  },
  "editorial": { "tags": [], "notes": [] }, // nosso; nunca atribuído à banca
}
```

Regras:

1. `exam.banca` e `exam.orgao` são campos diferentes. No concurso, a banca (Cebraspe) não é o órgão (STJ). No vestibular, normalmente coincidem. Nunca preencher um com o outro.
2. Uma questão só aparece na busca do app com `status: "revisado"` e `rights.basis` diferente de `fato`. Itens `somente-gabarito` são índice interno.
3. `text` nunca é gerado nem reescrito por IA. A transcrição é manual ou vem de extração de PDF **revisada por pessoa**, e `method` registra qual foi.
4. O gabarito definitivo prevalece sobre o preliminar. Questão anulada fica com `letter: null` e não vira "sem gabarito".
5. Para o ENEM, um adaptador na leitura mapeia os campos atuais para `exam.kind: "enem"`, `banca: "INEP"` e `rights.basis: "terceiro:enem.dev (GPL-2.0 declarada)"`. Fica fora deste PR.

## Prova de conceito: `scripts/import-ufrgs-gabarito.mjs`

```bash
node scripts/import-ufrgs-gabarito.mjs 2024            # baixa gabarito e página da edição, calcula o SHA-256 dos cadernos
node scripts/import-ufrgs-gabarito.mjs 2024 --sem-hash # não baixa os PDFs
```

- Grava `data/sources/ufrgs-cv-<ano>.json`, que fica fora do Git como o resto do acervo.
- Só aceita edições conferidas à mão (`EDITIONS`), porque o endereço da página muda entre anos (por exemplo, `cv-2023-3`).
- Espera 1,5 s entre requisições, tenta de novo em caso de falha e se identifica no `user-agent`.
- Valida tabelas ímpares, números inválidos e IDs duplicados antes de gravar o arquivo final.
- **O PDF não é guardado, só o hash**, que prova qual versão do caderno oficial foi consultada.
- O teste `tests/ufrgs-gabarito.test.mjs` usa HTML sintético, sem conteúdo da COPERSE.

Resultado da execução real em 2026-11-27 (edição 2024):

- 195 itens: 13 matérias com 15 questões cada.
- 3 anuladas, conferidas como "ANULADA" na página oficial: Matemática 46, Espanhol 3 e Química 40.
- 6 cadernos com hash: o do 1º dia e os cinco do 2º dia, um por idioma.
- As línguas estrangeiras repetem a numeração, por isso a matéria faz parte do `id`.

## Próximos passos, cada um com decisão do autor

1. **Pedir autorização por escrito à COPERSE/UFRGS** para transcrever os enunciados das edições com download gratuito, com fim educacional, não comercial e com atribuição. Se ela vier, o número do documento entra em `rights.basis` e o texto passa a ser transcrito manualmente, com revisão. Fazer o mesmo pedido à Comvest e à Fuvest depois.
2. **Estender o índice de gabarito** para outros anos da UFRGS e para Fuvest, Unicamp e UERJ. Continua sem texto e com risco baixo. Cada edição é conferida à mão antes de entrar em `EDITIONS`.
3. **Concursos** só voltam à pauta se uma banca, ou um órgão que aplique a própria prova, publicar licença aberta ou autorizar por escrito.
4. **A demo pública nunca serve texto** de fonte sem `rights.basis` de licença ou autorização.
5. Quando o autor aprovar, atualizar o H6 do `STRATEGY.md` com esta decisão.
