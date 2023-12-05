function tableToCSVDownload(table) {
    let csv = []
    let rows = document.querySelectorAll("table tr")

    for (let i = 0; i < rows.length; i++) {
        let row = []
        let cols = rows[i].querySelectorAll("td, th")

        for (let j = 0; j < cols.length; j++) {
            row.push(cols[j].innerText)
        }
        csv.push(row.join(","))
    }
    downloadCSV(csv.join("\n"), "data_export.csv")
}

function downloadCSV(csv, filename) {
    let csvFile
    let downloadLink
    csvFile = new Blob([csv], { type: "text/csv" })
    downloadLink = document.createElement("a")
    downloadLink.download = filename
    downloadLink.href = window.URL.createObjectURL(csvFile)
    downloadLink.style.display = "none"
    document.body.appendChild(downloadLink)
    downloadLink.click()
}

function convertJsonToGeoJson(jsonData, latField, lonField) {
    let features = []
    jsonData.forEach(row => {
        // if the lat or lon field is empty, skip this row
        if (!row[latField] || !row[lonField]) {
            return
        } 
        let lat = truncateLatOrLon(row[latField])
        let lon = truncateLatOrLon(row[lonField])
        if (lat && lon) {
            let feature = {
                type: "Feature",
                properties: row,
                geometry: {
                    type: "Point",
                    coordinates: [lon, lat]
                }
            }
            features.push(feature)
        }
    })

    let geoJson = {
        type: "FeatureCollection",
        features: features
    };

    return geoJson
}

function convertDate(date) {
    let newDate = new Date(date)
    let month = newDate.getMonth() + 1
    let day = newDate.getDate()
    let year = newDate.getFullYear()
    return month + "/" + day + "/" + year
}

function truncateLatOrLon(latOrLon) {
    if (isNaN(latOrLon)) {
        return latOrLon
    } else {
        latOrLon = Number(latOrLon)
    }
    return latOrLon.toFixed(5)
}

function createOutputTable(data, schema) {
    let table = document.createElement("table")
    let thead = document.createElement("thead")
    let tbody = document.createElement("tbody")
    let tr = document.createElement("tr")

    table.classList.add("table")
    table.classList.add("table-responsive")
    table.style.marginTop = "10px"

    // if no data, return an empty table
    if (data.length == 0) {
        return table
    }

    let headers = Object.keys(data[0])
    let visible_by_default = []
    let fields = []
    let transformFunctions = []


    if (schema) {
        headers = schema.fields.map(field => field.alias)
        fields = schema.fields.map(field => field.name)
        transformFunctions = schema.fields.map(field => field.transformFunction)
        visible_by_default = schema.fields.map(field => field.visible_by_default)

        headers.forEach(header => {
            let th = document.createElement("th")
            th.innerText = header
            tr.appendChild(th)
            if (!visible_by_default[headers.indexOf(header)]) {
                th.style.display = "none"
            }
        })

        thead.appendChild(tr)
        table.appendChild(thead)

        data.forEach(item => {
            let tr = document.createElement("tr")
            fields.forEach(field => {
                let td = document.createElement("td")
                let index = fields.indexOf(field)
                let transformFunction = transformFunctions[index]
                if (transformFunction) {
                    td.innerText = window[transformFunction](item[field])
                } else {
                    td.innerText = item[field]
                }
                // if the field is not visible by default, hide the column
                if (!visible_by_default[index]) {
                    td.style.display = "none"
                }
                tr.appendChild(td)
            })
            tbody.appendChild(tr)
        })
        table.appendChild(tbody)
    } else {
        headers.forEach(header => {
            let th = document.createElement("th")
            th.innerText = header
            tr.appendChild(th)
        })

        thead.appendChild(tr)
        table.appendChild(thead)

        data.forEach(item => {
            let tr = document.createElement("tr")

            headers.forEach(header => {
                let td = document.createElement("td")
                td.innerText = item[header]
                tr.appendChild(td)
            })

            tbody.appendChild(tr)
        })

        table.appendChild(tbody)
    }

    // if the table has more than 10 rows, make it scrollable
    if (table.rows.length > 10) {
        table.style.overflowY = "scroll"
        table.style.display = "block"
        table.style.height = "500px"
    }

    // add a button to download the table as a CSV
    let downloadButton = document.createElement("button")
    downloadButton.classList.add("btn")
    downloadButton.classList.add("btn-primary")
    downloadButton.innerText = "Download CSV"
    downloadButton.style.marginTop = "10px"
    downloadButton.onclick = function () {
        tableToCSVDownload(table)
    }

    let div = document.createElement("div")

    let divControls = document.createElement("div")
    divControls.appendChild(downloadButton)

    let divCheckboxes = document.createElement("div")
    divCheckboxes.classList.add("colSelection")

    let divCheckboxesTitle = document.createElement("div")
    divCheckboxesTitle.innerText = "Show/Hide Columns"
    divCheckboxesTitle.classList.add("checkboxTitle")
    divCheckboxes.appendChild(divCheckboxesTitle)

    schema.fields.forEach(field => {
        let divCheckbox = document.createElement("div")
        divCheckbox.classList.add("checkboxWrapper")

        let checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.checked = field.visible_by_default
        checkbox.style.marginRight = "5px"
        checkbox.onchange = function () {
            let index = schema.fields.indexOf(field)
            let th = table.querySelectorAll("th")[index]
            let tds = table.querySelectorAll("td:nth-child(" + (index + 1) + ")")
            if (checkbox.checked) {
                th.style.display = "table-cell"
                tds.forEach(td => {
                    td.style.display = "table-cell"
                })
            } else {
                th.style.display = "none"
                tds.forEach(td => {
                    td.style.display = "none"
                })
            }
        }

        let label = document.createElement("label")
        label.innerText = field.alias

        divCheckbox.appendChild(checkbox)
        divCheckbox.appendChild(label)
        divCheckboxes.appendChild(divCheckbox)
    })

    // add a search box to filter the table
    let divSearch = document.createElement("div")
    divSearch.classList.add("searchWrapper")
    let search = document.createElement("input")
    search.type = "text"
    search.placeholder = "Search"
    search.classList.add("search")
    search.onkeyup = function () {
        let filter = search.value.toUpperCase()
        let trs = table.querySelectorAll("tbody tr")
        trs.forEach(tr => {
            let tds = tr.querySelectorAll("td")
            let found = false
            tds.forEach(td => {
                if (td.innerText.toUpperCase().indexOf(filter) > -1) {
                    found = true
                }
            })
            if (found) {
                tr.style.display = ""
            } else {
                tr.style.display = "none"
            }
        })
    }
    divSearch.appendChild(search)
    divControls.appendChild(divSearch)

    divControls.appendChild(divCheckboxes)

    div.appendChild(divControls)
    div.appendChild(table)
    return div

}