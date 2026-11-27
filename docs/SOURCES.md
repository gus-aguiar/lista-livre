# Fontes do banco de questões

## Base usada neste MVP

- **API ENEM / enem.dev**: https://enem.dev — projeto comunitário de questões estruturadas do ENEM, com texto, alternativas, imagens e gabarito. Não é uma API oficial do INEP. O catálogo consultado contém edições de 2009 a 2023.
- **Documentação**: https://docs.enem.dev/introduction
- **Repositório do provedor**: https://github.com/yunger7/enem-api
- **Provas e gabaritos originais, INEP**: https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos

Os arquivos de questões e o manifesto são gerados por `npm run import` e não fazem parte da distribuição do código. A licença MIT do aplicativo não se aplica aos materiais importados.

O manifesto `data/manifest.json` registra a data exata de coleta, edições, total e distribuição por área. `data/questions.json` é o snapshot local: pesquisar não depende da disponibilidade da API. As imagens continuam hospedadas na origem e exigem conexão.

## Importação reproduzível

Execute `node scripts/import-data.mjs` na raiz para atualizar todas as edições disponíveis. Opcionalmente informe anos, por exemplo `node scripts/import-data.mjs 2023 2022`; isso **substitui** o snapshot por esses anos.

O importador solicita intervalos de 50 questões, espera ao menos 1,1 segundo entre requisições, tenta novamente em caso de falha e só substitui o arquivo final depois de concluir a coleta e validar IDs únicos. O `offset` da API representa o número inicial da questão, com intervalo inclusivo; avançamos pelo maior número recebido mais um para evitar duplicatas. O bloco inicial de inglês é consultado separadamente; a seleção padrão de idioma varia entre edições. Registros idênticos retornados pelas duas consultas são deduplicados por ano, número e idioma; duplicatas com conteúdo divergente interrompem a publicação do snapshot. Limites documentados: https://docs.enem.dev/rate-limits.md. Nenhum texto de questão é gerado por IA.

## Esquema

`id` combina ENEM, ano, número e idioma; as questões de inglês e espanhol podem compartilhar número. `discipline` conserva as quatro áreas da fonte: `matematica`, `linguagens`, `ciencias-humanas`, `ciencias-natureza`. Texto original em Markdown é preservado em `context` e `alternativesIntroduction`. `alternatives` contém `letter`, `text`, `file` e `isCorrect`; `files` preserva as URLs da fonte. `sourceUrl` aponta para o endpoint individual. `language` é `ingles`, `espanhol` ou `null`.

`qualityWarnings` sinaliza imagens explicitamente marcadas como indisponíveis pela fonte (`broken-image.svg`) alternativas em quantidade diferente de cinco ou gabarito que não tenha exatamente uma alternativa correta. Isso não substitui revisão editorial: erros de transcrição, fórmulas e imagens incompletas podem existir mesmo sem aviso. Os totais não implicam cobertura integral de todos os cadernos, aplicações ou questões de cada ano.

## Assuntos e hashtags

As tags de área e idioma vêm dos metadados. As demais são **inferidas por regras simples de palavras-chave** no enunciado e nas alternativas, sem classificação oficial ou validação pedagógica. As regras legíveis estão em `scripts/import-data.mjs`: meio ambiente, energia, geometria, estatística, probabilidade, porcentagem, funções, saúde, genética, química, física, história, geografia, cidadania, filosofia, sociologia, literatura, interpretação de texto, arte/cultura e tecnologia. Uma questão pode receber várias tags e falsos positivos são possíveis. A busca textual é o complemento essencial; refinamento manual é uma evolução prevista.

## Licenças e atribuição

O repositório da API declara GNU GPL-2.0; sua documentação orienta respeitar essa licença e o site declara ter obtido o material de fontes abertas. Este projeto não copia a implementação da API: consome seus dados públicos e mantém a procedência. A declaração do provedor não é uma revisão independente dos direitos de textos, obras e imagens citados dentro das questões. Conservar atribuições originais e revisar as condições dos materiais é necessário antes de uma distribuição comercial ampla. Acesso público não é, por si só, uma licença universal de redistribuição de todo conteúdo incorporado.

Para ampliar o acervo, o portal do INEP é a fonte primária. Microdados estatísticos de candidatos não são um substituto para um banco de enunciados; o processo de ampliar provas em PDF requer extração e revisão editorial.

## Vestibulares e concursos

O levantamento de fontes, direitos e o modelo de procedência estão em [`FONTES-VESTIBULARES-CONCURSOS.md`](FONTES-VESTIBULARES-CONCURSOS.md). Por enquanto só existe um índice de gabarito da UFRGS, sem enunciados, gerado por `npm run import:ufrgs`, que fica fora do Git em `data/sources/`.
