# API local

Base: `http://localhost:3000/api`. Respostas em JSON. Sem autenticação: uso local apenas.

| Método | Rota                                                     | Retorno                                 |
| ------ | -------------------------------------------------------- | --------------------------------------- |
| GET    | `/stats`                                                 | `{total, years, disciplines}`           |
| GET    | `/questions?q=energia&discipline=&year=&page=1&limit=20` | `{items, total, page, pages}`           |
| GET    | `/questions/:id`                                         | Questão ou 404                          |
| GET    | `/lists`                                                 | Array de listas, mais recentes primeiro |
| GET    | `/lists/:id`                                             | Lista ou 404                            |
| POST   | `/lists`                                                 | Cria lista; status 201                  |
| PUT    | `/lists/:id`                                             | Atualização parcial; lista ou 404       |
| DELETE | `/lists/:id`                                             | Status 204 ou 404                       |

`q` pesquisa enunciado, alternativas, área e tags, ignorando acentos. Termos são combinados com AND e prefixos; `#` é normalizado como separador, não como operador de tag exclusiva. Filtro de área usa `matematica`, `linguagens`, `ciencias-humanas` ou `ciencias-natureza`. O limite máximo por página é 100.

Exemplo de criação:

```json
{
  "title": "Energia e sociedade",
  "teacher": "Professora Ana",
  "school": "Minha escola",
  "className": "3º ano",
  "instructions": "Leia com atenção.",
  "questionIds": []
}
```

Use IDs retornados pela busca. A ordem de `questionIds` define a ordem da impressão. Não são permitidos IDs repetidos ou inexistentes, nem mais de 500 questões por lista. Título é obrigatório. O servidor acrescenta `id`, `createdAt` e `updatedAt`.

Erros de validação retornam status 400 com `{ "error": "Mensagem" }`. Veja o esquema de questões em [SOURCES.md](SOURCES.md).
