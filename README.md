# userscript для изменения и улучшения веб интерфейса JIRA

данный юзерскрипт для JIRA:
1. добавлет функционал тайм трекинга с точностью до подтаска(todo пунт в тикете)
2. добавляет chartpie( диаграмму потреченного на пункты todo времени)
3. автоматизация рутины в интерфейсе JIRA
4. упрощение использования - больше не нужно использовать клавиатуру чтобы ввести затраченное время - оно вводится в 2-3 клика мышью. еще есть кеширование описаний на что затрачено время - в результате со временем всю активность по тикетам можно разедилить на типы и в 1 клик выбирать тип активности вместо того чтобы каждый раз вводить его с клавиатуры.

## данный скрипт экономит много времени если подсчитать за год, позволяет упорядочить рутинные рабочие процессы чтобы снизить усталость и стресс сотрудников и повысить и ускорить их продуктивность


# Содержание:
1. обзор проекта
2. описание кода/архитектуры, навигация по коду

## 1 обзор проекта

видеообзор находится в файле "1 review.mp4", либо по ссылке:  
https://rutube.ru/video/0b855a0c3a4b3847cea66a375b9f42d5/

инструкция по установке скрипта находится в 2 "installation.mp4", либо по ссылке:  
https://rutube.ru/video/9976622de57d133d9195ad74ead95a66/

## упрощение рабочих процессов, сокращение рутины

данный user script убирает повторяющиеся операции из рабочих процессов. он также предоставляет средства для структуризации и упорядочивания рабочих процессов. в процессе выполнения вышеупомянутых двух процессов вероятность автоматизации рабочих процессов возрастает многократно(почти на 100%). это позволяет сотруднику не выполнять повторяющиеся операции и тратить почти 0 времени на них. в результате возрастает эффективность труда сотрудника. компьютеры позволяют экономить время, время и здоровье - единственные ограниченные ресурсы в жизни человека(их невозможно восполнить). автоматизация осуществляется за счет компании либо можно заказать работу у любого ИТ специалиста. данный скрипт был протестирован в firefox, допустима перезагрузка страницы в любой момент времени, если время не было залоггированно оно будет залоггированно после перезагрузки страницы. ограничения скрипта: данные о потраченном времени хранятся в "памяти браузера" следовательно на другом компьютере с другим браузером учет с первого компьютера  будет отсутствовать. безопасность скрипта для данных компании может подтвердить любой web разработчик(достаточно начинающего разработчика) - заказать такую экспертизу можно очень дешево либо бесплатно. код приложения начинается в "APP ENTRY POINT".

в свободное от работы время я люблю автоматизировать улучшать и упрощать процессы на работе или в жизни(пишу скрикты для сайтов которые улучшают их функционал и решают проблемы юзабилити)


## 2 описание кода/архитектуры, навигация по коду

код среднего качества, имеет архитектуру MVC, модульность.