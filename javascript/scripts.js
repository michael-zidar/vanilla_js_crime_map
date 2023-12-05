const btnGetData = document.getElementById("btnGetData")
const selDataSource = document.getElementById("selDataSource")
const inpDateFrom = document.getElementById("inpDateFrom")
const inpDateTo = document.getElementById("inpDateTo")
const selGeo = document.getElementById("selGeo")
const lblSelGeo = document.getElementById('lblSelGeo')
const inpLimit = document.getElementById("inpLimit")
const divDataSource = document.getElementById("divDataSource")

// to do - add a function to create the input fields for the data source, based on the data_schemas.json file
// to do - add links to the original data source stuff
// to do - add upload csv file functionality
// to do - add styling defaults to the data_schemas.json file

// get the list of data sources from the data_schemas.json file and populate the data source select element

let data_schemas = {}
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

let initalFrom = yyyy + "-" + (mm - 1) + "-" + dd
let initalTo = yyyy + "-" + mm + "-" + dd

inpDateFrom.value = initalFrom
inpDateTo.value = initalTo

fetch("data/data_schemas.json")
    .then(response => response.json())
    .then(data => {
        Object.keys(data).forEach(key => {
            let option = document.createElement("option")
            option.value = key
            option.text = data[key].alias
            selDataSource.appendChild(option)
            data_schemas[key] = data[key]

            // on change set the form fields
            selDataSource.addEventListener("change", () => {
                setFormField(data_schemas[selDataSource.value])
            })
        })
        // set the form fields for the first data source
        setFormField(data_schemas[selDataSource.value])
    })

function setFormField(data) {
    if (data.geo_field && data.geo_field.options) {
        lblSelGeo.style.display = "block"
        selGeo.style.display = "block"
        console.log(data.geo_field.alias)
        lblSelGeo.innerText = data.geo_field.alias
        // fill the options 
        selGeo.innerHTML = ""
        let option = document.createElement("option")
        option.value = 0
        option.text = "All"
        selGeo.appendChild(option)
        data.geo_field.options.forEach(geo => {
            let option = document.createElement("option")
            option.value = geo.value
            option.text = geo.label
            selGeo.appendChild(option)
        })
    } else {
        lblSelGeo.style.display = "none"
        selGeo.style.display = "none"
    }
    if(data.default_time_period_in_days && data.default_time_period_in_days > 0){
        let dateFrom = new Date()
        let dateTo = new Date()
        dateFrom.setDate(dateFrom.getDate() - data.default_time_period_in_days)
        dateFrom = dateFrom.toISOString().split("T")[0]
        dateTo = dateTo.toISOString().split("T")[0]
        inpDateFrom.value = dateFrom
        inpDateTo.value = dateTo
    }
    if(data.default_limit){
        inpLimit.value = data.default_limit
    }
    divDataSource.innerHTML = ""
    if(data.url){
        let a = document.createElement("a")
        a.href = data.url
        a.innerText = "View data source"
        a.target = "_blank"
        // make the link a softer color and remove the underline
        a.style.color = "#007bff"
        a.style.textDecoration = "none"
        // float it to the right
        a.style.float = "right"
        

        divDataSource.appendChild(a)
    
    }
}



btnGetData.addEventListener("click", () => {
    let schema = selDataSource.value
    schema = data_schemas[schema]
    getData(schema)
})

function getData(schema) {
    console.log("getData() called")
    btnGetData.disabled = true

    // remove all markers from map
    crimeLayer.clearLayers()

    // if the crime layer is on the map, remove it
    if (map.hasLayer(crimeLayer)) {
        map.removeLayer(crimeLayer)
    }

    let api_url = schema.api_url
    api_url = api_url + schema.api_default_query
    let limit = inpLimit.value || 1000

    let dateFrom = inpDateFrom.value
    let dateTo = inpDateTo.value
    let district = selGeo.value

    // if dateFrom is empty, set it to today's date
    if (dateFrom == "") {
        dateFrom = initalFrom
    }

    // if dateTo is empty, set it to today's date
    if (dateTo == "") {
        dateTo = initalTo
    }

    if (district != 0) {
        api_url = api_url + ` ${schema.geo_field.name}='${district}' AND`
    }

    api_url = api_url + ` ${schema.date_field} >= '${dateFrom}' AND ${schema.date_field} <= '${dateTo}' ORDER BY ${schema.date_field} DESC LIMIT ${limit}`

    fetch(api_url)
        .then(response => response.json())
        .then(data => {
            let districtText = selGeo.options[selGeo.selectedIndex].text
            let countOfRows = data.length
            let geoJson = data
            if (schema.response_type == "json") {
                // if the schema has a combined_geo_field attribute and it is true split the geo field into lat and lon and whatever else then convert to geojson
                if (schema.combined_geo_fields) {
                    // get the name of the geography column from the schema as the value of the geography field
                    let geography_field = schema.combined_geo_fields.split(",")[0]
                    data.forEach(row => {
                        Object.keys(row[geography_field]).forEach(key => {
                            row[key] = row[geography_field][key]
                        }
                        )
                    })
                }
                geoJson = convertJsonToGeoJson(data, schema.geography.split(",")[0], schema.geography.split(",")[1])
            }

            L.geoJSON(geoJson, {
                pointToLayer: function (feature, latlng) {
                    let markerColor = "#007bff"
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
                    if (schema.popup_template) {
                        popup_template = schema.popup_template
                        // replace {field_name} with the value of feature.properties.field_name
                        Object.keys(feature.properties).forEach(key => {
                            popup_template = popup_template.replace(`{${key}}`, feature.properties[key])
                        })

                        layer.bindPopup(popup_template, {
                            maxWidth: 500
                        })
                    }

                }
            }).addTo(crimeLayer)

            let title = `<h2>${schema.alias} ${districtText} -  ${countOfRows} ${schema.unit_of_analysis} between ${dateFrom} and ${dateTo}</h2>`

            let table = createOutputTable(data, schema)



            let output = title
            document.getElementById("output").innerHTML = output
            document.getElementById("output").appendChild(table)
            btnGetData.disabled = false

            crimeLayer.addTo(map)
            map.fitBounds(crimeLayer.getBounds())
        })
}

// when the page loads, call getData()
//getData()