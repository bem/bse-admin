bse-admin
=========

Сборщик данных для [bem-site-engine](https://github.com/bem/bem-site-engine)

Используется как dev-зависимость в [bem-site-engine](https://github.com/bem/bem-site-engine)
в режиме разработки.

В качестве хранилища данных используется база данных [LevelDB](http://en.wikipedia.org/wiki/LevelDB)
и [nodejs модуль](https://github.com/rvagg/node-levelup)

Архитектурно данный сборщик представляет собой nodejs приложение, которое имеет command line интерфейс
и предоставляет определенное js API для возможности вызова основных команд из сторонних приложений.

Структура работы основана на создании сценариев и последовательном выполнении всех этапов в данных сценариях.

Доступные сценарии описаны модулями которые находятся в директории [targets](./src/targets)

## Сценарии

Сценарий представляет собой класс который должен быть унаследован от класса [TargetBase](./src/targets/base.js)

```
var TargetBase = require('./base').TargetBase,
    TargetFoo = function (options) {
        this.init(options);
    };

TargetFoo.prototype = Object.create(TargetBase.prototype);
TargetFoo.prototype.init = function (options) {
    [
        // Set list of tasks here
    ].forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetFoo.prototype.getName = function () {
    return 'Your target name';
};

exports.TargetFoo = TargetFoo;
```

При создании сценария должны быть переопределен метод `init` в котором нужно указать массив тех
шагов которые должны быть выполнены для данного сценария в той последовательности в какой они написаны.

Также должен быть переопределен метод `getName` который должен возвращать название сценария.
Это необходимо для построения логов.

### Доступные существующие сценарии

#### Очистка базы данных

Удаляет все записи из базы данных.

Название: `CLEAR DATABASE`
Модуль: `./src/targets/clear-db.js`
Примечание: Можно передать массив шаблонов названий ключей. Записи соответствующие ключам
которые попадают под соответствующий шаблон будут удалены.

#### Публикация модели

Собирает `*.json` файл из js - структуры описания модели и шлет его на сервер провайдера данных.

Название: `UPDATE MODEL`
Модуль: `./src/targets/update-model.js`
Примечание: Можно передать хост и порт провайдера данных.
Если эти опции не указаны, то хост и порт будут выставлены по значениям указанным в конфигурационном файле.
