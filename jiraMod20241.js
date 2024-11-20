// ==UserScript==
// @name         Jira time consumption monitor
// @namespace
// @version      1.0
// @description  time consumption monitor
// @author
// @include        *://jira.tortu.ga/browse/*
// @require https://code.jquery.com/jquery-2.2.4.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.6.0/Chart.min.js
// @run-at document-start
// @grant GM.xmlHttpRequest
// ==/UserScript==

/* DEVELOPMENT MODE script localhost loader
(() => {
function l1(a) {console.log('[>>>] '+a);}
const e = 'http://localhost/GreaseMonkey_extensions/index.php?s=jiraMod20241.js&r='+Math.max(0.1, Math.random())*9999999999+'&r2='+Math.max(0.1, Math.random())*9999999999
const t = (er) => { if (200 === er.status && er.responseText) {eval(er.responseText)} else {l1("Error loading Script "+e+" :", er.statusText)} }
function onDocumentReady () { if (!GM || !GM.hasOwnProperty('xmlHttpRequest')) {l1('NO GM.xmlHttpRequest')} GM.xmlHttpRequest({ method: "GET", url:e, onload:t, onerror:t }) }
if (document.readyState === 'loading') {document.addEventListener("DOMContentLoaded", onDocumentReady)} else {onDocumentReady()}
})()
*/

'use strict';

// region ======================================================== SCRIPT SETTINGS >

//{ variants list

const SCRIPT_JIRA_VERSION_1 = "old"
/** new version (2024) */
const SCRIPT_JIRA_VERSION_2 = "latest"

const SCRIPT_RUNTIME_MODE_DEVELOPMENT = 0
const SCRIPT_RUNTIME_MODE_PRODUCTION = 1

//} END OF variants list

const SCRIPT_VERSION = 2
const SCRIPT_RUNTIME_MODE = SCRIPT_RUNTIME_MODE_DEVELOPMENT
const SCRIPT_JIRA_VERSION = SCRIPT_JIRA_VERSION_1

let APP_LOCALE

setTimeout(function () {
    APP_LOCALE = VAppLocalization.LOCALE_RU_RU
}, 1)

// endregion ======================================================== SCRIPT SETTINGS <


// region ======================================================== AGENT FRAMEWORK MINI VERSION >

class DataProcessor {
    DataProcessor(data) {this.data = data}
    process(data=null) {this.data = data ? data : this.data}

    data = null
    resultData = null
    opStatus = DataProcessor.ID_OP_FAILURE

    static ID_OP_SUCCESS = 0
    static ID_OP_FAILURE = 1
}

//data detector
class DDPageType extends DataProcessor {
    static NAME = "DDPageType"

    static ID_PROCESSABLE = DDPageType.NAME + ">" + "ID_PROCESSABLE"
    static ID_NON_PROCESSABLE = DDPageType.NAME + ">" + "ID_NONPROCESSABLE"
}

// endregion ======================================================== AGENT FRAMEWORK MINI VERSION <


// region ======================================================== NETWORK ADAPTERS >

class NetUrlsV1 {
    get TEMPLATE_TEMPO_RECORDS() {
        return "https://jira.tortu.ga/rest/tempo-time-activities/1/issue/%issueSN%/?page=%pageSN%&size=%pageSize%&activityType=all&currentUser=false"
    }
    get TEMPLATE_TASKS_LIST() {
        return "https://jira.tortu.ga/rest/api/2/issue/%issueKey%/properties/sd-checklists-%taskListSN%?_="+(Math.max(0.01,
        Math.random())*9913374937402)
    }
}

class NetUrlsV2 extends NetUrlsV1 {}

// endregion ======================================================== NETWORK ADAPTERS <


// region ======================================================== DATA ADAPTERS >

class DPTaskInformationV1 {

    getIssueID() {
        if (!document.getElementById('key-val')) return null
        return document.getElementById('key-val').getAttribute('rel')
    }

    getIssueKey() {
        if (!document.getElementById('key-val')) return null
        return document.getElementById('key-val').getAttribute('data-issue-key')
    }

    getTotalTempoRecords(htmlPageElementsList) {
        const tempoPagerDisplayNotPresent = HTMLPageElements.getElement(htmlPageElementsList.TEMPO_LIST_PAGER_NOT_PRESENT)
        if (tempoPagerDisplayNotPresent) {
            return 0
        } else {
            const tempoPagerDisplay = HTMLPageElements.getElement(htmlPageElementsList.TEMPO_LIST_PAGER_DISPLAY)
            if (tempoPagerDisplay) {
                const numberMatch = tempoPagerDisplay.textContent.match(/\((\d+) items\)/);
                return numberMatch ? parseInt(numberMatch[1]) : 0;
            } else {
                return null
            }
        }
    }

    /*
    getTaskList() {
        const checklistContainerPresent1 = HTMLPageElements.getElement(htmlPageElementsList.CHECK_LIST_CONTAINER)
        const checklistContainerPresent2 = HTMLPageElements.getElement(htmlPageElementsList.CHECK_LIST_ITEM_LIST)
        const checklistContainerNotPresent = HTMLPageElements.getElement(htmlPageElementsList.CHECK_LIST_CONTAINER_NOT_PRESENT)
        if (checklistContainerNotPresent) ticketInformation.taskList = []
        if (!checklistContainerPresent1 && !checklistContainerPresent2) {return false}

        const raskItemListsContainers = document.querySelectorAll(htmlPageElementIDAndClassesList.raskItemListsContainershtmlclass)
        if (!raskItemListsContainers || raskItemListsContainers.length < 1) return false

        const taskList = []
        raskItemListsContainers.forEach(taskItemListsContainer => {
            const taskItemsContainer = taskItemListsContainer.querySelector(htmlPageElementIDAndClassesList.taskItemsContainer)
            if (!taskItemsContainer) return false

            const taskItems = taskItemsContainer.firstChild.childNodes
            taskItems.forEach(itemContainer => { taskList.push(itemContainer.querySelector(".name-label").textContent.trim()) })
        })
        return taskList
    }*/

}
class DPTaskInformationV2 extends DPTaskInformationV1 {}

class DPItemsTimeSpentV1 extends DataProcessor {

    async process(data = null) {
        super.process(data);
        if (!this.data.activities) {this.resultData = []; return true;}
        this.resultData = await this.data.activities.map(activity => ({dt: activity.dateTime.substring(0, 10), d: activity.description, a: activity.assignee, s: activity.value}))
        return true
    }

}
class DPItemsTimeSpentV2 extends DPItemsTimeSpentV1 {}

class DPItemsTaskListV1 extends DataProcessor {

    async process(data = null) {
        super.process(data);
        if (this.data.errors) {l.l('no checklist items'); this.resultData = []; return true;}

        this.resultData = [].concat(data.value.checklists.map(cl => ({
            id: cl.id, name: cl.name,
            items: cl.items.map(i => (i.name.slice(3, -4)))
        })).map(i => i.items))
        return true
    }

}
class DPItemsTaskListV2 extends DPItemsTaskListV1 {}


// endregion ======================================================== DATA ADAPTERS <


// region ======================================================== VIEW ADAPTERS >

class ViewAdapter {

}

class HTMLPageElements {

    /**
     * @returns {HTMLElement|null|Element}
     */
    static getElement(elementID) {
        const {id, className, attr, textContent} = elementID
        if (id) {
            const eById = document.getElementById(id)
            if (!textContent) return eById
            if (eById) {
                if (eById.textContent.includes(textContent)) return eById
                return null
            }
        }

        if (textContent && !className && !attr) {
            return HTMLPageElements.getElementWithTextPresent((textContentTabName)? textContentTabName  :'div', textContent)
        }

        if (!className && !attr) return null

        let selector = ""
        if (className) selector = "." + className
        if (attr) selector = selector + "" + Object.entries(attr).map(([name, value]) => `[${name}="${value}"]`).join("")
        let result = document.querySelector(selector)
        if (textContent && !result.textContent.includes(textContent)) result = null
        return result
    }

    static getElementWithTextPresent(tagName, text) {
        const elementArray = Array.from(document.getElementsByTagName(tagName))
        let foundElement = null
        elementArray.forEach(element => { if (element.textContent.includes(text)) foundElement = element })
        return foundElement;
    }
}

// region ======================================================== VIEW ADAPTERS > JIRA >


// region ======================================================== VIEW ADAPTERS > JIRA > TEMPO >


class VAJIRATempo extends ViewAdapter {

    static maintainLogRecordDialogAdditionalUI(ticketData, timeAndTextChooser) {
        const cnt = $('#tempo-global-dialog-bundled')
        const d = cnt.find('div[role="dialog"]')
        if (d.length <1 ) {timeAndTextChooser.hide(); return;}
        if (document.getElementById('time-spent-picker-container') !== null ) {timeAndTextChooser.show(); return}

        let descList = Array.from(new Set( [...ticketData.taskList[0], ...ticketData.listTempoRecords.map(record => record.d)] ))

        timeAndTextChooser.add(cnt, descList, d[0].offsetWidth,
            function (a) {
            webJSHTMLSetPageInputValues(null, ['textarea[placeholder="Description"]'] , [a] )

        }, function (a) {
                webJSHTMLSetPageInputValues(null,
                    //1
                    // ['#timeSpentSeconds']
                    ['#plannedHours']
                    , [a] )

        })

    }

    static pressButton(buttonID, elResult = null) {
        webJSHTMLPagePressButton(null, buttonID, elResult)
    }

    static fillFormLogRecord(description, timeSpentText, elResult = null) {
        webJSHTMLSetPageInputValues(null,
            ['textarea[placeholder="Description"]',
                //1
                // '#timeSpentSeconds']
                '#plannedHours']
            , [description, timeSpentText]
            , elResult)
    }

    //1
    //static ID_BUTTON_ADD_LOG_RECORD = '.sc-iwsKbI.iDGrIF.sc-jzJRlG.ejNDzZ'

    //1
    //static ID_BUTTON_SAVE_LOG_RECORD = 'button[name=submitWorklogButton]'

    static ID_BUTTON_ADD_LOG_RECORD = '[name=planTimeBtn]'
    static ID_BUTTON_SAVE_LOG_RECORD = 'button[name="savePlanButton"]'

}



// endregion ======================================================== VIEW ADAPTERS > JIRA > TEMPO <

/**
 * for help see HTMLPageElements
 */
class HTMLPageElementsListV1 {
    //static NAME = {id:"value" |, className:"value", attr: {name:"val"}}
    get TEMPO_LIST_PAGER_DISPLAY () {return {attr: {name: "paginationText"}} }
    get TEMPO_LIST_PAGER_NOT_PRESENT () {return {attr: {name: "esPlanTimeBtn"}} }
    get TEMPO_PIE_CHART_INSERT_BERFORE () {return {id: "checklists-issue-left-panel"} }

    get CHECK_LIST_CONTAINER () {return {className: "checklist-box-content-wrapper"} }
    get CHECK_LIST_ITEM_LIST () {return {className: "item-list"} }
    get CHECK_LIST_CONTAINER_NOT_PRESENT () {return {id: "com_soldevelo_apps_checklists-container", textContentTabName: "div", textContent: "You don't have required permissions to add checklists. Contact you Jira administrator."} }

    get TASK_LIST_CONTAINER () {return {id: 'com_soldevelo_apps_checklists-container'} }

}
class HTMLPageElementsListV2 extends HTMLPageElementsListV1 {}

class HTMLPageElementIDAndClassesListV1 {
    get raskItemListsContainershtmlclass () {return '.checklist-box' }
    get taskItemsContainer () {return '.item-list' }
}
class HTMLPageElementIDAndClassesListV2 extends HTMLPageElementIDAndClassesListV1 {}

class VAJIRA {

    static cssContainer = `<style></style>`

    static htmlContainer = `<div id="tempochartmodule" class="module toggle-wrap collapsed">
<div id="tempochartmodule_heading" class="mod-header"><ul class="ops"></ul>
<button class="aui-button toggle-title" aria-label="Tempo DataChart" aria-controls="tempochartmodule" aria-expanded="false" resolved=""><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><g fill="none" fill-rule="evenodd"><path d="M3.29175 4.793c-.389.392-.389 1.027 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955c.388-.392.388-1.027 0-1.419-.389-.392-1.018-.392-1.406 0l-2.298 2.317-2.307-2.327c-.194-.195-.449-.293-.703-.293-.255 0-.51.098-.703.293z" fill="#344563"></path></g></svg></button>
<h4 class="toggle-title">Tempo DataChart</h4>
</div>
<div class="mod-content">%content%</div>
</div>`;
    
}

// endregion ======================================================== VIEW ADAPTERS > JIRA <


// endregion ======================================================== VIEW ADAPTERS <


// region ======================================================== VIEW LIB >

class ViewLib {}


// region ================== DATA CHART 1 =============== >

class VLDataChart1 extends ViewLib {
    
    constructor(chartData) {
        super()
        this.generateColors()
        if (chartData.length < 1) return
        this.chartPie1_redraw($('#tempoPieChart'), chartData)
        this.chartBar1_redraw($('#chart-bar-container'), chartData)
    }

    pieChart1HTML = `<div id="chart-bar-container"></div> 
<div id="pie-wrapper"> <canvas id="outer-circle" width="300" height="300"></canvas> </div> 
 <div id="diagram-legend"></div>`;

    pieChart1CSS = `<style>
#outer-circle {width: 600px; height: 600px}
#pie-wrapper {align-self: center; width:70% !important; height:70% !important;}
#tempoPieChart { display: flex; flex-direction: column; }
#diagram-legend {padding: 10px 0px;}
#diagram-legend ul {list-style: none;}
#diagram-legend li {padding-bottom: 3px; border-bottom: 1px lightgray  solid; cursor: pointer; user-select: none;}
#diagram-legend li :hover {background-color: lightgrey;}
#diagram-legend .timeSpent { font-family: 'Courier New', Courier, monospace;}
#diagram-legend .timeSpent span { width: 1em; display: inline-block; height: 1em; margin-right: 6px; }</style>`;

    barChart1HTML = `<div id="tempo-stacked-bar-chart-container"> <canvas height="100px" id="tempo-stacked-bar-chart"></canvas> </div>`

    barChart1CSS = '<style>#tempo-stacked-bar-chart-container { display:block; }</style>'

    static secondsToHhMm(seconds) {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return (hours > 0 ? hours + 'h' : '') + '' + (minutes > 0 ? minutes + 'm' : '')
    }

    generateRandomColors(numColors) {
        const colors = [];

        const getRandomColor = () => {
            const dict = '02468ACE'
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += dict[Math.floor(Math.random() * dict.length)];
            }
            return color;
        };

        while (colors.length < numColors) {
            let color = getRandomColor();
            if (!colors.includes(color)) {
                colors.push(color);
            }
        }

        return colors;
    }

    minTextLength(minLength, text) {
        text = text.trim()
        if (text.length < minLength) {
            text = text + '&nbsp;'.repeat(minLength - text.length)
        }
        return text
    }

    /**
     *
     * @param listData [{amount:55, title:"11"}]
     */
    chartBar1_redraw(container, listData) {
        $(container).html(this.barChart1HTML + '' + this.barChart1CSS)

        let chartColorsListCopy = [...this.chartColorsList]
        const destinationData = listData.map((item) => {
            return {data: [item.amount], backgroundColor: chartColorsListCopy.shift()}
        });

        let barOptions_stacked = {
            tooltips: {enabled: false}, hover: {animationDuration: 0}, height: 100,
            scales: {
                xAxes: [{ticks: {beginAtZero: true, fontSize: 0}, scaleLabel: {display: false}, stacked: true}],
                yAxes: [{ticks: {fontSize: 14}, stacked: true}]
            },
            legend: {display: false},
            animation: {
                onComplete: function () {
                    let ctx = this.chart.ctx;
                    ctx.textAlign = "left";
                    ctx.fillStyle = "#000";
                    let tt = this

                    const barModelsList = []
                    Chart.helpers.each(tt.data.datasets.forEach(function (dataset, i) {
                        let meta = tt.chart.controller.getDatasetMeta(i);
                        Chart.helpers.each(meta.data.forEach(function (bar, index) {
                            const bm = barModelsList[barModelsList.length - 1]
                            let xx = (i === 0) ? 15 : (bm.x + 5)
                            ctx.fillText(VLDataChart1.secondsToHhMm(dataset.data[index]), xx, bar._model.y - (14 * 2) + 14 * (i % 4))
                            barModelsList.push(bar._model)
                        }), tt)
                    }), tt)
                }
            }
        };

        let ctx = document.getElementById("tempo-stacked-bar-chart");

        let myChart = new Chart(ctx, {
            options: barOptions_stacked, type: 'horizontalBar', data: {
                labels: [""],
                datasets: destinationData
            }
        });
    }

    /**
     *
     * @param listData [{amount:55, title:"11"}]
     */
    chartPie1_redraw(container, listData) {
        $(container).html(this.pieChart1HTML + '' + this.pieChart1CSS)

        let config = {
            type: 'pie',
            data: {
                labels: listData.map(item => " " + VLDataChart1.secondsToHhMm(item.amount) + "    " + item.title),
                datasets: [{label: "", backgroundColor: this.chartColorsList, data: listData.map(item => item.amount),}]
            },
            options: {
                animation: {duration: 0}, legend: {display: false},
                tooltips: {
                    mode: 'label',
                    callbacks: {
                        label: function (tooltipItem, data) {
                            return " " + data['labels'][tooltipItem['index']]
                        }
                    }
                }
            }
        }

        let outerCircle = new Chart(document.getElementById("outer-circle"), config)

        let diagramLegend = document.getElementById('diagram-legend');
        diagramLegend.innerHTML = outerCircle.generateLegend()

        //sortChartLegendItems()
        //process legend text
        let liElements = document.querySelectorAll('#diagram-legend li');
        for (let i = 0; i < liElements.length; i++) {
            let liContent = liElements[i].innerHTML.split("    ")
            let leftPart = liContent[0].trim().split("</span> ")
            leftPart[0] = leftPart[0] + "</span> "
            leftPart = leftPart[0] + this.minTextLength(7, leftPart[1])
            liElements[i].innerHTML = "<div class='legendItem'>&nbsp;<b class='timeSpent'>" + leftPart + "</b>" + liContent[1] + "</div>"
        }

        let legendItems = document.querySelectorAll('#diagram-legend li');
        legendItems.forEach(function (item, itemIndex) {
            item.addEventListener('mouseenter', function () {
                highlightSegment(outerCircle, itemIndex, true)
            })
            item.addEventListener('mouseleave', function () {
                highlightSegment(outerCircle, itemIndex, false)
            })
        })

        function highlightSegment(chart, index, isHighlight) {
            let activeSegment = chart.getDatasetMeta(0).data[index];
            if (isHighlight) chart.updateHoverStyle([activeSegment], null, true); else chart.updateHoverStyle([activeSegment], null, false);
            chart.draw();
        }
    }

    chartColorsList
    generateColors() {
        this.chartColorsList = this.generateRandomColors(100)
    }
}



// endregion ================== DATA CHART 1 =============== <


// region ================== TIME SPENT CHOOSER =============== >

class VLTimeAndTextChooser extends ViewLib {

    cHTML = `
<div id="time-spent-picker-container">
  <div class="time-spent-picker">
    <div class="time-spent-picker-cnt1"><div class="title">Hours</div> <div id="hours-container"></div> </div>
    <div class="minutes-container"> <div class="title">Minutes</div> <table id="minutes-table"></table> </div>
  </div>
  <div id="description-cnt"><div id="description-container"></div></div>
</div>`

    cCSS = `<style>
#time-spent-picker-container { position:fixed; top:15px; left:15px; width: calc(100% - var(--width-b)); padding: 2px; border: 1px solid lightgray; display: flex; flex-direction:column; z-index: 9999; background-color: darkgray; }
.title { text-align: center; margin-bottom: 3px; }

#hours-container, #minutes-container1 { display: grid; grid-gap: 2px; grid-template-columns: repeat(10, 1fr); }

#hours-container { grid-template-columns: repeat(5, 1fr); }

#description-container button { text-align:left; }

.time-spent-picker, .time-spent-picker-cnt1 { display:flex; }
.time-spent-picker-cnt1 { flex-direction:column; }

#description-container, #description-cnt { display:flex; flex-direction:column; }
#description-cnt, .minutes-container, .time-spent-picker-cnt1 { border: 1px solid #ccc; padding: 3px; }
#description-container { overflow-y: auto; max-height: 100%; }

#minutes-table { border-collapse: collapse;  border-spacing: 0; }
#minutes-table button { width: 100%; }

#minutes-table tr:nth-child(odd) .button { background-color: lightgray;}
</style>`

    prepare() {
        $("head").append(this.cCSS)
    }

    hide() {
        const tspc = this.gebid("time-spent-picker-container")
        if (tspc !== null && tspc.style.display !== 'none') tspc.style.display = 'none'
    }

    show() {
        const tspc = this.gebid("time-spent-picker-container")
        if (tspc !== null && tspc.style.display !== 'block') tspc.style.display = 'block'
    }

    add(container, descriptionList, maxW, elSetDescription, elSetTimeTextField) {
        let tspc = this.gebid("time-spent-picker-container")
        if (tspc !== null) { return }

        $(container).append(this.cHTML)
        tspc = this.gebid("time-spent-picker-container")
        tspc.style.setProperty('--width-b', (maxW+70) + 'px');

        let minutesTable = this.gebid("minutes-table")
        let selectedH, selectedM


        for (let i = 1; i <= 20; i++) {
            let button = document.createElement("button");
            button.textContent = i; button.className = "button";
            button.onclick = function() { selectedH = i; updateSelectedValue();}
            this.gebid("hours-container").appendChild(button);
        }

        let row = minutesTable.insertRow();
        for (let j = 1; j <= 59; j++) {
            let button = document.createElement("button");
            button.textContent = j; button.className = "button";
            button.onclick = function() { selectedM = j; updateSelectedValue();}
            row.insertCell().appendChild(button)
            if (j%10 === 0) { row = minutesTable.insertRow() }
        }

        const t = this
        descriptionList.forEach(function(d) {
            let button = document.createElement("button");
            button.textContent = d; button.className = "button";
            button.onclick = function() { elSetDescription(d) }
            t.gebid("description-container").appendChild(button);
        })

        function updateSelectedValue() { elSetTimeTextField( ((selectedH)?selectedH+'h':'')+''+ ((selectedM)?selectedM+'m':'') ) }

        let descrCnt = this.gebid("description-container")
        function updateMaxHeight() { descrCnt.style.maxHeight = `calc(100vh - ${descrCnt.getBoundingClientRect().top}px)`; }
        updateMaxHeight()
        window.addEventListener("resize", updateMaxHeight)
    }

    gebid (a) {return document.getElementById(a)}

}

// endregion ================== TIME SPENT CHOOSER =============== <


// region ================== TASK LIST PROGRESS CONTROLS =============== >

class VLTaskProgressControls extends ViewLib {

    static STATE_STOPPED = 'stop'
    static STATE_STARTED = 'start'
    static STATE_PAUSED = 'pause'

    /**
     * @param elResult function (success)
     */
    add(elResult) {
        $("head").append(this.cCSS)

        const t = this
        const a = setInterval(function () {

            const checklistContainerNotPresent = HTMLPageElements.getElement(htmlPageElementsList.CHECK_LIST_CONTAINER_NOT_PRESENT)
            if (checklistContainerNotPresent) {
                clearInterval(a);
                elResult ? elResult(true) : 0;
                return;
            }

            const raskItemListsContainers = document.querySelectorAll(htmlPageElementIDAndClassesList.raskItemListsContainershtmlclass)
            if (raskItemListsContainers.length < 1) {
                return
            }

            const itemsListCnt = $('.' + htmlPageElementsList.CHECK_LIST_ITEM_LIST.className)
            const cbcw = $('.' + htmlPageElementsList.CHECK_LIST_CONTAINER.className)
            if (cbcw.length < 1 && itemsListCnt.length < 1) {
                return
            }

            const tpCnt = $('#taskPCNT')
            if (tpCnt.length < 1) cbcw.before(VLTaskProgressControls.progressStatusHTML)

            const cntPlace = $(".item-checkbox-container")
            if (cntPlace.length > 0) {
                cntPlace.each(function () {
                    let taskListItemDesc = $(this).closest('.item').find('.item-label').text()
                    let playButton = $('<button class="tempo-progress-start" type="start" task="' + taskListItemDesc + '"><i class="fas fa-play"></i></button>')
                    let pauseButton = $('<button class="tempo-progress-pause jira-enhancements1-hide" type="pause" task="' + taskListItemDesc + '"><i class="fas fa-pause"></i></button>')
                    let stopButton = $('<button class="tempo-progress-stop jira-enhancements1-hide" type="stop" task="' + taskListItemDesc + '"><i class="fas fa-stop"></i></button>')

                    playButton.click( function () { t.el_buttons(this) } )
                    pauseButton.click( function () { t.el_buttons(this) } )
                    stopButton.click( function () { t.el_buttons(this) } )

                    const bCnt = $('<div class="' + VLTaskProgressControls.buttonsCntClassName + '"></div>')
                    bCnt.append(playButton, pauseButton, stopButton);
                    $(this).after(bCnt)
                })
            }

            clearInterval(a)
            elResult ? elResult(true) : 0

        }, 500)

    }

    hide() {
        this.setState(null, null)
    }

    show() {
        this.setState('')
    }

    setState(taskDescr, state = VLTaskProgressControls.STATE_STOPPED) {
        const tpItems = $("."+VLTaskProgressControls.buttonsCntClassName)
        if (tpItems.length < 1) { l.l('tpItems.length < 1', Logger1.LEVEL_ERROR); return; }

        tpItems.each(function () {
            let t = $(this)
            t.find('.tempo-progress-start').addClass('jira-enhancements1-hide')
            t.find('.tempo-progress-pause').addClass('jira-enhancements1-hide')
            t.find('.tempo-progress-stop').addClass('jira-enhancements1-hide')
        })

        switch (state) {
            case VLTaskProgressControls.STATE_STARTED:
                tpItems.each(function () {

                    let t = $(this)
                    let st = t.find('.tempo-progress-start')
                    if (st.attr('task') === taskDescr) {
                        st.addClass('jira-enhancements1-hide')
                        t.find('.tempo-progress-pause').removeClass('jira-enhancements1-hide')
                        t.find('.tempo-progress-stop').removeClass('jira-enhancements1-hide')
                    }

                })
                break
            case VLTaskProgressControls.STATE_PAUSED:
                tpItems.each(function () {

                    let t = $(this)
                    let st = t.find('.tempo-progress-start')
                    if (st.attr('task') === taskDescr) {
                        st.removeClass('jira-enhancements1-hide')
                        t.find('.tempo-progress-pause').addClass('jira-enhancements1-hide')
                        t.find('.tempo-progress-stop').removeClass('jira-enhancements1-hide')
                    }

                })
                break
            case VLTaskProgressControls.STATE_STOPPED:
                tpItems.each(function () {

                    let t = $(this)
                    let st = t.find('.tempo-progress-start')
                    st.removeClass('jira-enhancements1-hide')

                })
                break

            default:
                break
        }
    }

    /**
     * @param listener function (eventType, taskDescriptionText) // ex. (VLTaskProgressControls.?, "acquire task information")
     */
    prepare(listener) {
        this.listener = listener
    }

    el_buttons(a) {
        this.listener(a.getAttribute('type'), a.getAttribute('task'))
    }

    listener

    progressStatusHTML = `<div id="taskPCNT"></div>`
    static buttonsCntClassName = `task-list-item-time-tracking-buttons`

    cCSS = `<style>
#taskPCNT {size: 25px !important; background-color: aliceblue; font-weight: bold;}
        .${VLTaskProgressControls.buttonsCntClassName} {margin-right: 10px;}
</style>`

}

// endregion ================== TASK LIST PROGRESS CONTROLS =============== <


// endregion ======================================================== VIEW LIB <


// region ======================================================== SERVICE >

class Logger1 {
    constructor(name) {
        this.name = name
    }

    l(msg, level = "info >") {
        console.log("["+this.name+"] "+level+" "+msg)
    }

    name

    static LEVEL_INFO = "info >"

    static LEVEL_WARNING = "warning >"
    static LEVEL_ERROR = "error >"
}

let l = new Logger1(">>>")

class TextUtils {
    static replaceStrings(targetText, placeholdersList, stringsList) {
        if (placeholdersList.length !== stringsList.length) {return targetText;}

        placeholdersList.forEach((placeholder, index) => {
            targetText = targetText.split(placeholder).join(stringsList[index]);
        });

        return targetText;
    }
}

// endregion ======================================================== SERVICE <


// region ======================================================== DATA >


// region ======================================================== DATA LIB >

class DataLib {}

/**
 * adapter persistent data
 */
class APersistentData {
    constructor(id) {this.id = id}
    get(name) { return localStorage.getItem(this.id+""+name) }
    set(name, value) { localStorage.setItem(this.id+""+name, value) }
    id
}


class DUPersistent {
    constructor(id= "") {
        this.init(id)
    }

    init (id="") {
        this.apd = new APersistentData("20240418-jiraMod20241"+id)
    }

    store() {
        Object.getOwnPropertyNames(this).forEach(fieldName => {if (fieldName === "apd") return
            if (typeof this[fieldName] !== 'function') { this.lssi(fieldName, this[fieldName]) }
        })
    }

    load() {
        Object.getOwnPropertyNames(this).forEach(fieldName => {if (fieldName === "apd") return
            if (typeof this[fieldName] !== 'function') {
                this[fieldName] = this.lsgi(fieldName)
            }
        })
    }

    lsgi(a) { return this.apd.get(a) }
    lssi(a, b) { this.apd.set(a, b) }

    apd

}


// endregion ================== TASK PROGRESS STATE =============== <

class DLTaskProgressState {

    prepareControl(elOut, elIn = null) {
        this.elOut = elOut
    }

    prepareData(issueId) {
        this.duTaskProgress = new DUTaskProgress(issueId)
        this.duTaskProgress.load()
    }

    startApp() {
        let t = this
        if (this.duTaskProgress.progressState === DUTaskProgress.PROGRESS_STATE_STARTED) {
            this.timerInterval = setInterval(function () {t.updateTimePassed()}, 1000)
            this.updateTimePassed()
        } else if (this.duTaskProgress.progressState === DUTaskProgress.PROGRESS_STATE_PAUSED) {
            this.updateTimePassed()
        }
    }

    startProgress() {
        let t = this
        if (!this.duTaskProgress.is_paused()) {
            this.duTaskProgress.startTime = Date.now()
        } else {
            this.duTaskProgress.pausedTime += Date.now() - this.duTaskProgress.pausedStartTime
        }
        this.duTaskProgress.progressState = DUTaskProgress.PROGRESS_STATE_STARTED
        this.timerInterval = setInterval(function () {t.updateTimePassed()}, 1000)
        this.updateTimePassed()
    }

    pauseProgress() {
        this.duTaskProgress.progressState = DUTaskProgress.PROGRESS_STATE_PAUSED
        clearInterval(this.timerInterval)
        this.duTaskProgress.pausedStartTime = Date.now()
    }

    stopProgress() {
        this.duTaskProgress.progressState = DUTaskProgress.PROGRESS_STATE_STOPPED
        this.duTaskProgress.pausedStartTime = 0
        this.duTaskProgress.startTime = 0
        this.duTaskProgress.pausedTime = 0
        clearInterval(this.timerInterval)
    }

    getTimeSpentText() {
        return this.formatTime(this.getCurrentTime(), true)
    }

    getCurrentTime() {
        let currentTime
        if (!this.duTaskProgress.is_paused()) {
            currentTime = Date.now() - this.duTaskProgress.startTime - this.duTaskProgress.pausedTime
        } else {
            currentTime = this.duTaskProgress.pausedStartTime - this.duTaskProgress.startTime - this.duTaskProgress.pausedTime
        }
        return currentTime / 1000
    }

    updateTimePassed() {
        this.elOut(DLTaskProgressState.EVENT_UPDATE_TIME_PASSED_TEXT, {text:this.formatTime(this.getCurrentTime())})
    }

    formatTime(seconds, hideSeconds) {
        if (hideSeconds && seconds < 60) return null
        let hours =(seconds>3600)?Math.floor(seconds / 3600):0
        let minutes = (seconds>60)?Math.floor((seconds / 60) % 60):0
        let remainingSeconds = Math.floor(seconds % 60)
        remainingSeconds = ((remainingSeconds+"").length>1)?remainingSeconds:"0"+remainingSeconds
        minutes = ((minutes+"").length>1)?minutes:"0"+minutes
        hours = ((hours+"").length>1)?hours:"0"+hours
        let r = (hideSeconds)?"":(remainingSeconds + "s")
        r = (minutes > 0) ? minutes + "m" + r : r
        r = (hours > 0) ? hours + "h" + r : r
        return r
    }

    /**
     * {text:"02h22m01s}
     */
    static EVENT_UPDATE_TIME_PASSED_TEXT

    elOut

    duTaskProgress

    timerInterval

}


// region ================== TASK PROGRESS STATE =============== >


// endregion ======================================================== DATA LIB <


// region ======================================================== DATA APPLICATION >

class DUAppData extends DUPersistent {

    constructor(id= "") {super(id)}

    static ID_OPERATION_NONE = 0
    static ID_OPERATION_ADD_TEMPO_RECORD = 1

    load() {
        super.load()
        if (this._currentPendingOperationID === null) this.currentPendingOperationID = DUAppData.ID_OPERATION_NONE
        this._currentPendingOperationID = (this._currentPendingOperationID !== null) ? parseInt(this._currentPendingOperationID) : 0
        this._currentPendingOperationID = (!isNaN(this._currentPendingOperationID)) ? this._currentPendingOperationID : DUAppData.ID_OPERATION_NONE
    }

    _currentPendingOperationID

    get currentPendingOperationID() {return this._currentPendingOperationID}
    set currentPendingOperationID(a) {this._currentPendingOperationID = a; this.store();}
}

class DUTicketData {
    issueId=null
    issueKey=null
    numTempoRecords=null
    listTempoRecords=null
    taskList=null

    hasActivityRecord(date, description, time) {
        if (!Array.isArray(this.listTempoRecords)) return false

        return this.listTempoRecords.some(activity => {
            return activity.dt === date && activity.d === description && data.taskProgress.formatTime(activity.s, true) === time
        })

    }

}

class DUTaskProgress extends DUPersistent {

    constructor(id= "") {
        super(id)
    }

    load() {
        super.load()
        if (this._progressState == null) this.progressState = DUTaskProgress.PROGRESS_STATE_STOPPED
        this._pausedTime = (this._pausedTime !== null) ? parseInt(this._pausedTime) : 0
        this._pausedTime = (!isNaN(this._pausedTime)) ? this._pausedTime : 0
        this._startTime = (this._startTime !== null) ? parseInt(this._startTime) : 0
        this._startTime = (!isNaN(this._startTime)) ? this._startTime : 0
        this._pausedStartTime = (this._pausedStartTime !== null) ? parseInt(this._pausedStartTime) : 0
        this._pausedStartTime = (!isNaN(this._pausedStartTime)) ? this._pausedStartTime : 0

        this._progressState = (this._progressState !== null) ? parseInt(this._progressState) : 0
        this._progressState = (!isNaN(this._progressState)) ? this._progressState : DUTaskProgress.PROGRESS_STATE_STOPPED
    }

    static PROGRESS_STATE_STOPPED = 0
    static PROGRESS_STATE_STARTED = 1
    static PROGRESS_STATE_PAUSED = 2

    _progressState
    _pausedTime
    _startTime
    _pausedStartTime
    _currentTaskTitle
    _currentTaskDate
    _currentTaskTime

    get progressState() {return this._progressState}
    set progressState(a) {this._progressState = a; this.store();}
    get pausedTime() {return this._pausedTime}
    set pausedTime(a) {this._pausedTime = a; this.store();}
    get startTime() {return this._startTime}
    set startTime(a) {this._startTime = a; this.store();}
    get pausedStartTime() {return this._pausedStartTime}
    set pausedStartTime(a) {this._pausedStartTime = a; this.store();}
    get currentTaskTitle() {return this._currentTaskTitle}
    set currentTaskTitle(a) {this._currentTaskTitle = a; this.store();}
    get currentTaskTime() {return this._currentTaskTime}
    set currentTaskTime(a) {this._currentTaskTime = a; this.store();}
    get currentTaskDate() {return this._currentTaskDate}
    set currentTaskDate(a) {this._currentTaskDate = a; this.store();}

    is_paused() { return this._progressState === DUTaskProgress.PROGRESS_STATE_PAUSED }
}


class Data {

    constructor() {
        this.app = new DUAppData()
        this.ticket = new DUTicketData()
        this.taskProgress = new DLTaskProgressState()
    }

    prepare() {
        this.taskProgress.prepareData(this.ticket.issueId)
        this.app.init(this.ticket.issueId)
        this.app.load()
    }

    app
    ticket
    taskProgress

}

let data = new Data()



// endregion ======================================================== DATA APPLICATION >


// endregion ======================================================== DATA <


// region ======================================================== NETWORK >
class Network {
    
    static async loadData(url) {//l.l('Network.loadData '+url)
        try {
            const response = await fetch(url)
            if (!response.ok) {l.l('net !response.ok url='+url+' response=', Logger1.LEVEL_ERROR);console.log(response);}
            return await response.json()
        } catch (error) {l.l('net fetch error url='+url, Logger1.LEVEL_ERROR);return null;}
    }

}

// endregion ======================================================== NETWORK <


// region ======================================================== CONTROL >

class Control {

    prepare(data, view, elResult=null) {
        this.v = view
        this.d = data


        const t = this
        this.v.taskProgressControls.prepare(
            function (eventType, taskDescriptionText) { t.el_taskStateChanged(eventType, taskDescriptionText) }
        )

        this.d.taskProgress.prepareControl(function (type, data) {
            switch (type) {
                case DLTaskProgressState.EVENT_UPDATE_TIME_PASSED_TEXT:
                    t.v.updateTaskProgressTimePassed(data.text)
                    break
            }
        })

        setInterval(function () {
            t.v.maintainAdditionalUI(t.d.ticket) }, 500)

        elResult?elResult(true):0
    }

    startApplication() {
        this.v.displayDataCharts(this.d.ticket)
        this.d.taskProgress.startApp()
        const tp = this.d.taskProgress.duTaskProgress

        if (this.d.app.currentPendingOperationID === DUAppData.ID_OPERATION_ADD_TEMPO_RECORD) {
            l.l('add tempo record')
            this.v.setTaskProgressControllsVisibility(false)
            this.v.updateTaskProgressState(
                this.v.loc.processText(Loc.ID_TEXT_TITLE_SAVING_INFO_ABOUT_LAST_WORK_SESSION, {title:tp.currentTaskTitle, time:tp.currentTaskTime} ) )
            tp.currentTaskDate = new Date().toISOString().slice(0, 10)
            this.addTempoRecord(tp.currentTaskTitle, tp.currentTaskTime, true)
        } else {
            let taskDescriptionText = tp.currentTaskTitle
            switch (tp.progressState) {
                case DUTaskProgress.PROGRESS_STATE_STARTED:
                    this.v.taskProgressControls.setState(tp.currentTaskTitle, VLTaskProgressControls.STATE_STARTED)
                    this.v.updateTaskProgressState(
                        this.v.loc.processText(Loc.ID_TEXT_TITLE_WORKING_ON_TASK , {taskTitle:"<b>"+taskDescriptionText+"</b>"} ) )
                    break
                case DUTaskProgress.PROGRESS_STATE_PAUSED:
                    this.v.taskProgressControls.setState(tp.currentTaskTitle, VLTaskProgressControls.STATE_PAUSED)
                    this.v.updateTaskProgressState(
                        this.v.loc.processText( Loc.ID_TEXT_TITLE_WORKING_ON_TASK_PAUSED, {taskTitle:"<b>"+taskDescriptionText+"</b>"} ) )
                    break
                case DUTaskProgress.PROGRESS_STATE_STOPPED:
                    this.v.taskProgressControls.setState(tp.currentTaskTitle, VLTaskProgressControls.STATE_STOPPED)
                    this.v.updateTaskProgressState("")
                    this.v.updateTaskProgressTimePassed("")
                    break
            }
        }

    }

    el_taskStateChanged(eventType, taskDescriptionText) {
        const tp = this.d.taskProgress.duTaskProgress
        tp.currentTaskTitle = taskDescriptionText

        switch (eventType) {
            case VLTaskProgressControls.STATE_STARTED:
                this.d.taskProgress.startProgress()
                this.v.taskProgressControls.setState(taskDescriptionText, VLTaskProgressControls.STATE_STARTED)
                this.v.updateTaskProgressState(
                    this.v.loc.processText(Loc.ID_TEXT_TITLE_WORKING_ON_TASK , {taskTitle:"<b>"+taskDescriptionText+"</b>"} ) )
                break
            case VLTaskProgressControls.STATE_PAUSED:
                this.d.taskProgress.pauseProgress()
                this.v.taskProgressControls.setState(taskDescriptionText, VLTaskProgressControls.STATE_PAUSED)
                this.v.updateTaskProgressState(
                    this.v.loc.processText( Loc.ID_TEXT_TITLE_WORKING_ON_TASK_PAUSED, {taskTitle:"<b>"+taskDescriptionText+"</b>"} ) )
                break
            case VLTaskProgressControls.STATE_STOPPED:
                this.v.taskProgressControls.setState(taskDescriptionText, VLTaskProgressControls.STATE_STOPPED)
                this.v.updateTaskProgressState("")
                this.v.updateTaskProgressTimePassed("")

                const tst = this.d.taskProgress.getTimeSpentText()
                tp.currentTaskTime = tst
                tp.currentTaskDate = new Date().toISOString().slice(0, 10)
                if (tst) {
                    this.v.setTaskProgressControllsVisibility(false)
                    this.v.updateTaskProgressState(
                        this.v.loc.processText(Loc.ID_TEXT_TITLE_SAVING_INFO_ABOUT_LAST_WORK_SESSION, {title:tp.currentTaskTitle, time:tp.currentTaskTime} ) )

                    this.addTempoRecord(taskDescriptionText, tst)
                }
                this.d.taskProgress.stopProgress()
                break
        }
    }

    addTempoRecord(taskTitle, timeText, appStartup) {
        if (data.app.currentPendingOperationID !== DUAppData.ID_OPERATION_NONE && !appStartup) {
            l.l('addTempoRecord data.app.currentPendingOperationID != DUAppData.ID_OPERATION_NONE', Logger1.LEVEL_ERROR)
            l.l('the op is:'+JSON.stringify(data.app.currentPendingOperationID))
            return
        }
        this.d.app.currentPendingOperationID = DUAppData.ID_OPERATION_ADD_TEMPO_RECORD
        let t = this

        VAJIRATempo.pressButton(VAJIRATempo.ID_BUTTON_ADD_LOG_RECORD, function (a) {
            if (!a) {l.l('failed: VAJIRATempo.ID_BUTTON_ADD_LOG_RECORD'); return; }

            VAJIRATempo.fillFormLogRecord(taskTitle, timeText, function (a) {
                if (!a) {l.l('failed: VAJIRATempo.fillFormLogRecord('+[taskTitle, timeText].join(',')); return; }

                VAJIRATempo.pressButton(VAJIRATempo.ID_BUTTON_SAVE_LOG_RECORD, function (a) {
                    if (!a) { l.l('failed: VAJIRATempo.ID_BUTTON_SAVE_LOG_RECORD'); return; }

                    getDataFromTheNetworkTempo().then(a => {
                        if (!a) return

                        //test mode no tempo spent log
                        t.d.app.currentPendingOperationID = DUAppData.ID_OPERATION_NONE
                        t.v.setTaskProgressControllsVisibility(true)
                        t.v.updateTaskProgressState('')
                        return


                        //confirm the presence of that tempo record
                        const tp = t.d.taskProgress.duTaskProgress
                        if (t.d.ticket.hasActivityRecord(tp.currentTaskDate, tp.currentTaskTitle, tp.currentTaskTime)) {
                            t.d.app.currentPendingOperationID = DUAppData.ID_OPERATION_NONE
                            t.v.setTaskProgressControllsVisibility(true)
                            this.v.updateTaskProgressState('')
                            l.l('tempo record addition confirmed')
                            //redraw data charts
                            t.v.displayDataCharts(t.d.ticket)
                        } else {
                            l.l('tempo record addition failed', Logger1.LEVEL_ERROR)
                        }

                    })

                })

            })
        })

    }

    d
    v

}

let control = new Control()



// endregion ======================================================== CONTROL <


// region ======================================================== VIEW >

class VAppLocalization {
    static LOCALE_RU_RU = 1
    static LOCALE_EN_US = 2
}

class Loc extends VAppLocalization {

    processText(id, variables) {
        if (this.getText(id)) {
            return Object.keys(variables).reduce((result, key) => {
                return result.replace(`%${key}%`, variables[key]);
            }, this.getText(id))
        } else {
           return "!TEXT NOT FOUND:"+id
        }
    }

    getText(id) {

    }

    static ID_TEXT_TITLE_WORKING_ON_TASK = 1
    static ID_TEXT_TITLE_WORKING_ON_TASK_PAUSED = 2
    static ID_TEXT_TITLE_SAVING_INFO_ABOUT_LAST_WORK_SESSION = 3

}

class VALRuRu extends Loc {

    text = [
        ""
        ,"работа над задачей:%taskTitle%"
        ,"работа над задачей приостановлена:%taskTitle%"
        ,"попытка сохранения информации о последней рабочей сессии. подождите. информация о сессии: %title% / %time%"

    ]

    getText(id) {
        return this.text[id]
    }

}

class VALEnUS extends Loc {

    text = [
        ""
        ,"working on task: %taskTitle%"
        ,"work on task is suspended: %taskTitle%"
        ,"attempting to store information about the last work session. wait. session info: %title% / %time%"
    ]

    getText(id) {
        return this.text[id]
    }

}


class View {

    constructor(localeId) {
        switch (localeId) {
            case VAppLocalization.LOCALE_EN_US:
                this.loc = new VALEnUS()
                break
            case VAppLocalization.LOCALE_RU_RU:
                this.loc = new VALRuRu()
                break
        }

    }

    static sCSS = `<style>
.task-list-item-time-tracking-buttons button { margin-right: 2px; }
.jira-enhancements1-hide {display:none !important;}
#tempoTaskStateCnt {display: flex;}
#tempoTaskTimeSpent, #tempoTaskState {display:none; margin-right: 5px; padding: 2px;}
#tempoTaskTimeSpent {border: 2px solid gray;}
.jsInvA { -moz-box-pack: start !important; justify-content: right !important; }
</style>`

    static dataChartCnt = '<div id="tempoPieChart"></div>'

    /**
     * @param elResult function (success)
     */
    prepare(elResult) {
        $("head").append(View.sCSS)
        $("head").append($('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">'))

        this.tempoTaskProgressDisplayCnt = $('<div id="tempoTaskStateCnt"></div>')[0]
        this.tempoTaskProgressTimePassedDisplay = $('<div id="tempoTaskTimeSpent"></div>')[0]
        this.tempoTaskProgressStateDisplay = $('<div id="tempoTaskState"></div>')[0]
        $(HTMLPageElements.getElement(htmlPageElementsList.TASK_LIST_CONTAINER)).before(this.tempoTaskProgressDisplayCnt)
        this.tempoTaskProgressDisplayCnt.appendChild(this.tempoTaskProgressTimePassedDisplay)
        this.tempoTaskProgressDisplayCnt.appendChild(this.tempoTaskProgressStateDisplay)

        this.timeAndTextChooser = new VLTimeAndTextChooser()
        this.timeAndTextChooser.prepare()

        let t = this
        this.addTempoCharts(function (a) {
            if (!a) l.l('failure: addTempoCharts')

            t.taskProgressControls = new VLTaskProgressControls()
            t.taskProgressControls.add(function (a) {
                if (!a) l.l('failure: add')

                elResult ? elResult(true) : 0
            })
        })

    }

    maintainAdditionalUI(ticketData) {
        VAJIRATempo.maintainLogRecordDialogAdditionalUI(ticketData, this.timeAndTextChooser)
    }

    updateTaskProgressTimePassed(text) {
        this.tempoTaskProgressTimePassedDisplay.innerHTML = text
        this.tempoTaskProgressTimePassedDisplay.style.display = (text.length>0)?"block":"none"
    }

    updateTaskProgressState(text) {
        this.tempoTaskProgressStateDisplay.innerHTML = text
        this.tempoTaskProgressStateDisplay.style.display = (text.length>0)?"block":"none"
    }

    setTaskProgressControllsVisibility(a) {
        if (a) $(this.tempoTaskProgressTimePassedDisplay).removeClass('jira-enhancements1-hide')
        if (!a) $(this.tempoTaskProgressTimePassedDisplay).addClass('jira-enhancements1-hide')

        if (!a) this.taskProgressControls.hide()
        if (a) this.taskProgressControls.show()
    }

    /**
     * @param elResult function (success)
     */
    addTempoCharts(elResult) {
        const a = setInterval(function () {

            const tempoDataChartPlace = HTMLPageElements.getElement(htmlPageElementsList.TEMPO_PIE_CHART_INSERT_BERFORE)
            if (!tempoDataChartPlace) { l.l('!tempoDataChartPlace', Logger1.LEVEL_WARNING); return; }

            this.chartModContainer = $(VAJIRA.htmlContainer.split('%content%').join(View.dataChartCnt) + VAJIRA.cssContainer)
            $(tempoDataChartPlace).before(this.chartModContainer)
            
            clearInterval(a)
            elResult ? elResult(true) : 0
        }, 500)
    }


    displayDataCharts(ticketData, popup = false) {
        let chartData = ticketData.listTempoRecords.map(record => ({amount: record.s, title: record.d}))

        //process data
        const sumsByTitle = {};
        chartData.forEach(entry => {
            if (sumsByTitle.hasOwnProperty(entry.title)) {
                sumsByTitle[entry.title] += entry.amount;
            } else {
                sumsByTitle[entry.title] = entry.amount;
            }
        })
        chartData = Object.entries(sumsByTitle).map(([title, amount]) => ({title, amount}));
        chartData.sort(function (a, b) { return b.amount - a.amount })

        this.dataChart1 = new VLDataChart1(chartData)
        //l.l(chartData.map(item => {return item.title+'/'+item.amount+' | '+this.dataChart1.secondsToHhMm(item.amount)+"  ;;  "} ))
    }

    loc
    chartModContainer
    tempoTaskProgressTimePassedDisplay
    tempoTaskProgressStateDisplay

    taskProgressControls

    dataChart1

    timeAndTextChooser
}

let view

// endregion ======================================================== VIEW <


// region ======================================================== ENVIRONMENT >


// region ======================================================== ENVIRONMENT - ADAPTERS >

function prepareEnvironmentAdapters() {
    prepareEnvironmentAdaptersData()
    prepareEnvironmentAdaptersDataNetwork()
    prepareEnvironmentAdaptersView()
}

// region ======================================================== ENVIRONMENT - ADAPTERS - DATA >

let dataProcessors = {taskInformation:null, itemsTimeSpent:null, itemsActivityType:null}

function prepareEnvironmentAdaptersData() {

    if (SCRIPT_JIRA_VERSION === SCRIPT_JIRA_VERSION_1) {
        dataProcessors.taskInformation = new DPTaskInformationV1()
        dataProcessors.itemsTimeSpent = new DPItemsTimeSpentV1()
        dataProcessors.itemsTaskList = new DPItemsTaskListV1()
    }

    if (SCRIPT_JIRA_VERSION === SCRIPT_JIRA_VERSION_2) { throw new Error('support removed') }

}

function getDataFromTheEnvironment(elResult=null, timeout=10000) {
    setTimeout(function (){ elResult?elResult(false):0; }, timeout)

    getDataFromTheLocalEnvironment(function (a) {
        if (!a) { l.l('failure: getDataFromTheLocalEnvironment', Logger1.LEVEL_ERROR); return; }

        getDataFromTheNetwork(function (a) {
            if (!a) { l.l('failure: getDataFromTheNetwork', Logger1.LEVEL_ERROR); return; }

            l.l('data.ticket:'+ JSON.stringify({issueId:data.ticket.issueId,issueKey:data.ticket.issueKey}))
            elResult?elResult(true):0;elResult=null;
        })

    })

}

function getDataFromTheLocalEnvironment(elResult=null, timeout=10000) {
    setTimeout(function (){ clearInterval(a); elResult?elResult(false):0; }, timeout)

    const a = setInterval(function () {
        if (!acuireTicketData(data.ticket)) return

        if (data.ticket.issueId === null || data.ticket.issueKey === null) {
            l.l("no issue id", Logger1.LEVEL_ERROR);
            clearInterval(a)
            elResult?elResult(false):0;elResult=null;
        } else {
            clearInterval(a)
            elResult?elResult(true):0;elResult=null;
        }

    }, 500)
}


/**
 * @returns {Promise<null|*[{d: description, a: assignee, s: value}]|*>}
 */
async function getTempoLogRecords(tempoUrlTemplate, issueSN, pageSN, pageSize) {if (pageSize<1) return []
    const a_url = TextUtils.replaceStrings(tempoUrlTemplate, ['%issueSN%', '%pageSN%', '%pageSize%'], [issueSN, 1, pageSize])

    const data = await Network.loadData(a_url)
    if (data === null) {
        l.l('getTempoLogRecords no data', Logger1.LEVEL_ERROR)
        return null
    }

    await dataProcessors.itemsTimeSpent.process(data)
    return dataProcessors.itemsTimeSpent.resultData
}

/**
 * @returns {Promise<null|*[{d: description, a: assignee, s: value}]|*>}
 */
async function getTaskItems(urlTemplate, issueKey, taskListSN) {
    const a_url = TextUtils.replaceStrings(urlTemplate, ['%issueKey%', '%taskListSN%'], [issueKey, taskListSN])

    const data = await Network.loadData(a_url)
    if (data === null) {
        l.l('getTaskItems no data:', Logger1.LEVEL_ERROR)
        return null
    }

    await dataProcessors.itemsTaskList.process(data)
    return dataProcessors.itemsTaskList.resultData
}

/**
 * @param ticketInformation DUTicketData
 * @returns {boolean} data collection completed
 */
function acuireTicketData(ticketInformation) {
    if (ticketInformation.issueId === null) {
        ticketInformation.issueId = dataProcessors.taskInformation.getIssueID()
        if (ticketInformation.issueId === null) return false
    }

    if (ticketInformation.issueKey === null) {
        ticketInformation.issueKey = dataProcessors.taskInformation.getIssueKey()
        if (ticketInformation.issueKey === null) return false
    }

    if (ticketInformation.numTempoRecords === null) {
        ticketInformation.numTempoRecords = dataProcessors.taskInformation.getTotalTempoRecords(htmlPageElementsList)
        if (ticketInformation.numTempoRecords === null) return false
    }

    return true
}

// endregion ======================================================== ENVIRONMENT - ADAPTERS - DATA <


// region ======================================================== ENVIRONMENT - ADAPTERS - DATA - NETWORK >

let envNetUrls

function prepareEnvironmentAdaptersDataNetwork() {

    if (SCRIPT_JIRA_VERSION === SCRIPT_JIRA_VERSION_1) {
        envNetUrls = new NetUrlsV1()
    }

    if (SCRIPT_JIRA_VERSION === SCRIPT_JIRA_VERSION_2) { throw new Error('support removed') }

}

async function getDataFromTheNetwork(elResult) {
    getDataFromTheNetworkTempo()
    getDataFromTheNetworkTasks()
    elResult?elResult(true):0
}

/**
 * @returns success
 */
async function getDataFromTheNetworkTempo() {
    data.ticket.listTempoRecords = await getTempoLogRecords(envNetUrls.TEMPLATE_TEMPO_RECORDS, data.ticket.issueId, 1, data.ticket.numTempoRecords)
    return data.ticket.listTempoRecords !== null
}

/**
 * @returns success
 */
async function getDataFromTheNetworkTasks() {
    data.ticket.taskList = await getTaskItems(envNetUrls.TEMPLATE_TASKS_LIST, data.ticket.issueKey, 0)
    return data.ticket.taskList !== null
}


// endregion ======================================================== ENVIRONMENT - ADAPTERS - DATA - NETWORK <



// region ======================================================== ENVIRONMENT - ADAPTERS - VIEW >

let htmlPageElementsList
let htmlPageElementIDAndClassesList

function prepareEnvironmentAdaptersView() {

    if (SCRIPT_JIRA_VERSION === SCRIPT_JIRA_VERSION_1) {
        //view
        htmlPageElementsList = new HTMLPageElementsListV1()
        htmlPageElementIDAndClassesList = new HTMLPageElementIDAndClassesListV1()
    }

    if (SCRIPT_JIRA_VERSION === SCRIPT_JIRA_VERSION_2) { throw new Error('support removed') }

}

/**
 * set form input values on a webpage
 * @param inputsContainerID can be null; ex. '#form1'
 * @param listInputID ex. ['#input1', '.textarea2']
 * @param listInputValues ['input value1', 'input value 2']
 * @param elResult can be null; ex. function (success) {if (success) {alert('inputs are set')}else{alert('inputs are not found on the page during search timeout')}}
 * @param timeout (milliseconds) inputs search timeout
 * @param elementSearchInterval (milliseconds) search elements interval
 * @param mode only "framework.React" is supported
 */
function webJSHTMLSetPageInputValues(inputsContainerID, listInputID, listInputValues, elResult, timeout= 7000, elementSearchInterval= 500, mode="framework.React"){
    if (mode !== "framework.React") return

    let fr
    let firstElement
    let currentElementID =  listInputID.shift()
    let currentElementValue = listInputValues.shift()

    setTimeout(function (){ clearInterval(a); elResult?elResult(false):0; }, timeout)

    let elementFound = false
    const a = setInterval(function (){

        //let fr = $('#planForm')
        fr = !fr ? $(inputsContainerID?inputsContainerID:document) : fr
        if (fr.length<1) return

        let f = fr.find(currentElementID)
        if (f.length<1) return
        if (!firstElement) firstElement = f

        switch (f[0].tagName.toLowerCase()) {
            case "textarea":
                f.focus()
                f.val(currentElementValue)[0].dispatchEvent(new Event('input', { bubbles: true }))
                if (f.val() !== currentElementValue) l.l('!==')
                break
            case "input":
                f.focus()
                f.val(currentElementValue)[0].dispatchEvent(new Event('input', { bubbles: true }))
                f[0].dispatchEvent(new Event('blur', { bubbles: true }))
                break
            default:
                l.l('tagName not supported:'+f[0].tagName.toLowerCase())
                break
        }

        if (listInputID.length<1) {
            firstElement.focus();
            elResult?elResult(true):0
            elResult = null
            clearInterval(a)
        }

        currentElementID = listInputID.shift()
        currentElementValue = listInputValues.shift()


    },elementSearchInterval)

}

/**
 * press a button on a webpage
 * @param buttonContainerID ex. '#form1'
 * @param buttonID ex. '.button1'
 * @param elResult function (success) {if (success) {alert('button pressed')}else{alert('button is not found on the page during search timeout')}}
 * @param timeout (milliseconds) inputs search timeout
 * @param elementSearchInterval (milliseconds) search elements interval
 */
function webJSHTMLPagePressButton(buttonContainerID, buttonID, elResult, timeout= 7000, elementSearchInterval= 500) {
    setTimeout(function () { clearInterval(a); elResult?elResult(false):0; }, timeout)

    let fr
    const a = setInterval(function () {

        fr = !fr ? $(buttonContainerID ? buttonContainerID : document) : fr
        if (fr.length < 1) return

        let f = fr.find(buttonID)

        if (f.length < 1) return
        f.click()
        clearInterval(a)
        elResult?elResult(true):0
        elResult = null
    })
}


// endregion ======================================================== ENVIRONMENT - ADAPTERS - VIEW <


// endregion ======================================================== ENVIRONMENT ADAPTERS <


// endregion ======================================================== ENVIRONMENT <





/// ======================================================== CODE ENTRY POINT >

l.l('SCRIPT_VERSION: '+SCRIPT_VERSION)
l.l('SCRIPT_JIRA_VERSION: '+SCRIPT_JIRA_VERSION)

setTimeout(function() {
    if (document.readyState === 'loading') { document.addEventListener("DOMContentLoaded", onDocumentReady) } else { onDocumentReady() }
}, 100)

function onDocumentReady() {
    // APP ENTRY POINT
    view = new View(APP_LOCALE)

    prepareEnvironmentAdapters()

    getDataFromTheEnvironment(function (a) {
        if (!a) { l.l('failure: getDataFromTheEnvironment', Logger1.LEVEL_ERROR); return; }

        data.prepare()
        view.prepare(function (a) {
            if (!a) { l.l('!Wiew.prepare()', Logger1.LEVEL_ERROR); return; }

            control.prepare(data, view, function (a) {
                if (!a) { l.l('!control.prepare()', Logger1.LEVEL_ERROR); return; }

                control.startApplication()

            })

        })

    })

}
