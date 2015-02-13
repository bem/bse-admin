## Полная сборка модели

Основной сценарий выполнения. Проверяет наличие обновленного файла модели.
Синхронизирует модель, проверяет обновление документации, новых версий библиотек и мета-информации по
авторам и переводчикам. Переопределяет ссылки в документах, строит файл `sitemap.xml`. При наличии изменений
создает копию базы данных в папке с текущей датой.

* Название: `NODES SYNCHRONIZATION`
* Модуль: [nodes.js](../../src/targets/nodes.js)