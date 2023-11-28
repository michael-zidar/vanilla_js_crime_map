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

    // Download CSV file
    downloadCSV(csv.join("\n"), "shootings.csv")
}

function downloadCSV(csv, filename) {
    let csvFile
    let downloadLink

    // CSV file
    csvFile = new Blob([csv], { type: "text/csv" })

    // Download link
    downloadLink = document.createElement("a")

    // File name
    downloadLink.download = filename

    // Create a link to the file
    downloadLink.href = window.URL.createObjectURL(csvFile)

    // Hide download link
    downloadLink.style.display = "none"

    // Add the link to DOM
    document.body.appendChild(downloadLink)

    // Click download link
    downloadLink.click()
}

function convertJsonToGeoJson(jsonData, latField, lonField) {
    return {
        type: "FeatureCollection",
        features: jsonData.map(item => ({
            type: "Feature",
            properties: item, // include all properties
            geometry: {
                type: "Point",
                coordinates: [item[lonField], item[latField]]
            }
        }))
    };
}

function convertDate(date) {
    let newDate = new Date(date)
    let month = newDate.getMonth() + 1
    let day = newDate.getDate()
    let year = newDate.getFullYear()
    return month + "/" + day + "/" + year
}

function truncateLatOrLon(latOrLon) {
    // if latOrLon cannot be converted to a number, return it as is
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


    if (schema) {
        let headers = schema.fields.map(field => field.alias)
        let fields = schema.fields.map(field => field.name)
        let transformFunctions = schema.fields.map(field => field.transformFunction)

        headers.forEach(header => {
            let th = document.createElement("th")
            th.innerText = header
            tr.appendChild(th)
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
                    td.innerText = transformFunction(item[field])
                } else {
                    td.innerText = item[field]
                }
                tr.appendChild(td)
            })

            tbody.appendChild(tr)
        })

        table.appendChild(tbody)

        return table

    } else {
        let headers = Object.keys(data[0])

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
    
        return table
    }

}
