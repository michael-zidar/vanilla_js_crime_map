const btnGetData = document.getElementById("btnGetData")

const inpDateFrom = document.getElementById("inpDateFrom")

const inpDateTo = document.getElementById("inpDateTo")

const selDistrict = document.getElementById("selDistrict")

let today = new Date()
// for mat today as yyyy-mm-dd
let dd = today.getDate()
let mm = today.getMonth() + 1
let yyyy = today.getFullYear()

if (dd < 10) {
    dd = "0" + dd
}

if (mm < 10) {
    mm = "0" + mm
}

let initalFrom = yyyy + "-" + (mm-1) + "-" + dd
let initalTo = yyyy + "-" + mm + "-" + dd

inpDateFrom.value = initalFrom
inpDateTo.value = initalTo


btnGetData.addEventListener("click", getData)

let map = L.map('map').setView([39.1133, -84.519], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map)

let crimeLayer = L.layerGroup().addTo(map)

function convertDate(date) {
    let newDate = new Date(date)
    let month = newDate.getMonth() + 1
    let day = newDate.getDate()
    let year = newDate.getFullYear()
    return month + "/" + day + "/" + year
}

function getData() {
    console.log("getData() called")
    // remove all markers from map
    crimeLayer.clearLayers()

    let api_url = "https://data.cincinnati-oh.gov/resource/7a3r-kxji.json?$query=SELECT cpd_neighborhood, district, age, race, sex, type, latitude_x, longitude_x, dateoccurred WHERE"

    let dateFrom = inpDateFrom.value
    let dateTo = inpDateTo.value
    let district = selDistrict.value

    // if dateFrom is empty, set it to today's date
    if (dateFrom == "") {
        dateFrom = initalFrom
    }

    // if dateTo is empty, set it to today's date
    if (dateTo == "") {
        dateTo = initalTo
    }

    if (district != 0) {
        api_url = api_url + ` district='${district}' AND`
    }

    api_url = api_url + ` dateoccurred >= '${dateFrom}' AND dateoccurred <= '${dateTo}' ORDER BY dateoccurred DESC LIMIT 1000`

    fetch(api_url)
        .then(response => response.json())
        .then(data => {
            let districtText = selDistrict.options[selDistrict.selectedIndex].text
            let victimCount = data.length

            let geoJson = convertJsonToGeoJson(data, "latitude_x", "longitude_x")

            L.geoJSON(geoJson, {
                pointToLayer: function (feature, latlng) {
                    let markerColor = "#007bff"
                    if (feature.properties.type == "FATAL") {
                        markerColor = "#ff0000"
                    }

                    return L.circleMarker(latlng, {
                        radius: 5,
                        fillColor: markerColor,
                        color: markerColor,
                        weight: 10,
                        opacity: 0.3,
                        fillOpacity: 1
                    })
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(`
                    <h3>${feature.properties.cpd_neighborhood}</h3>
                    <p>${feature.properties.type}</p>
                    `)
                }
            }).addTo(crimeLayer)

            let table = `
            <table class="table table-responsive">
                <tr>
                    <th>Neighborhood</th>
                    <th>District</th>
                    <th>Age</th>
                    <th>Race</th>
                    <th>Sex</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Lat</th>
                    <th>Lon</th>
                </tr>
            `
            data.forEach(function (item) {
                table += `<tr>
                            <td>${item.cpd_neighborhood}</td>
                            <td>${item.district}</td>
                            <td>${item.age}</td>
                            <td>${item.race}</td>
                            <td>${item.sex}</td>
                            <td>${item.type}</td>
                            <td>${convertDate(item.dateoccurred)}</td>
                            <td>${item.latitude_x}</td>
                            <td>${item.longitude_x}</td>
                        </tr>`
            })
            let title = `<h2>Cincinnati Shootings ${districtText} -  ${victimCount} Victims Between ${dateFrom} and ${dateTo}</h2>`

            table += `</table>`

            let btnDownload = `<button class="btn btn-primary" onclick="tableToCSVDownload()">Download CSV</button>`

            let output = title + btnDownload + table
            document.getElementById("output").innerHTML = output
        })


    
}

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