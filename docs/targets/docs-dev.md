## Обновление документации в режиме разработки

Вариант сборки при котором проверяется и синхронизируется только содержимое `*.md` файлов документации.
Кроме этого выполняется проверка информации по автором и переводчикам а также общие шаги
типа переопредления ссылок и создания `sitemap.xml` файла.

Главным образом данный сценарий используется для поиска ошибок на этапе разработки.

* Название: `DOCS SYNCHRONIZATION`
* Модуль: [docs.js](../../src/targets/docs-dev.js)