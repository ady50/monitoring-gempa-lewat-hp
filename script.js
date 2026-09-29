// =====================================================
// MQTT CONFIGURATION
// =====================================================

const MQTT_BROKER =
    "wss://broker.emqx.io:8084/mqtt";

const MQTT_DATA_TOPIC =
    "jusriadi/mpu6050/data";

const MQTT_CONTROL_TOPIC =
    "jusriadi/mpu6050/control";


// =====================================================
// RPM
// =====================================================

const MAX_RPM = 3000;


// =====================================================
// MQTT CLIENT
// =====================================================

const CLIENT_ID =
    "ESP32-MPU-WEB-" +
    Math.random()
        .toString(16)
        .substring(2, 10);


const MQTT_OPTIONS = {
    clientId: CLIENT_ID,
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 2000
};


// =====================================================
// VARIABLES
// =====================================================

let dataCount = 0;

let startTime = null;

let inputFocused = false;

let lastWebSend = 0;


// =====================================================
// BUFFER GRAFIK
// =====================================================

let signalBuffer = [];

let timeBuffer = [];

const MAX_BUFFER = 50;


// =====================================================
// HTML ELEMENT
// =====================================================

const mqttStatus =
    document.getElementById("mqttStatus");

const dataCounter =
    document.getElementById("dataCount");

const sensorStatus =
    document.getElementById("sensorStatus");

const lastUpdate =
    document.getElementById("lastUpdate");

const chartStatus =
    document.getElementById("chartStatus");

const adcElement =
    document.getElementById("adc");

const pwmElement =
    document.getElementById("pwm");

const speedElement =
    document.getElementById("speed");

const rpmElement =
    document.getElementById("rpm");

const manualAdcElement =
    document.getElementById("manualAdc");

const webInput =
    document.getElementById("webInput");

const webAdcValue =
    document.getElementById("webAdcValue");

const minusButton =
    document.getElementById("minusButton");

const plusButton =
    document.getElementById("plusButton");

const webControlButton =
    document.getElementById("webControlButton");

const resetButton =
    document.getElementById("resetButton");

const controlMode =
    document.getElementById("controlMode");


// =====================================================
// ADC RANGE
// =====================================================

const MIN_ADC = 0;
const MAX_ADC = 4095;


// =====================================================
// CHART
// =====================================================

const chartCanvas =
    document.getElementById(
        "accelerationChart"
    );

let accelerationChart = null;


// =====================================================
// BUAT CHART
// =====================================================

if (chartCanvas && typeof Chart !== "undefined") {

    accelerationChart = new Chart(
        chartCanvas,
        {
            type: "line",

            data: {
                labels: [],

                datasets: [
                    {
                        label: "Percepatan (m/s²)",

                        data: [],

                        borderWidth: 2,

                        pointRadius: 0,

                        tension: 0.2,

                        fill: false
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                animation: false,

                interaction: {
                    intersect: false,

                    mode: "index"
                },

                scales: {
                    x: {
                        title: {
                            display: true,

                            text: "Waktu (detik)"
                        }
                    },

                    y: {
                        title: {
                            display: true,

                            text: "Percepatan (m/s²)"
                        }
                    }
                }
            }
        }
    );

} else {

    console.error(
        "Chart.js atau canvas tidak ditemukan."
    );
}


// =====================================================
// MQTT CONNECT
// =====================================================

const client =
    mqtt.connect(
        MQTT_BROKER,
        MQTT_OPTIONS
    );


// =====================================================
// MQTT CONNECTED
// =====================================================

client.on(
    "connect",
    function () {

        console.log(
            "MQTT BERHASIL TERHUBUNG!"
        );

        mqttStatus.textContent =
            "● MQTT Connected";

        mqttStatus.className =
            "status connected";


        client.subscribe(
            MQTT_DATA_TOPIC,
            function (error) {

                if (error) {

                    console.error(
                        "Subscribe DATA gagal:",
                        error
                    );

                } else {

                    console.log(
                        "Subscribe DATA berhasil"
                    );
                }

            }
        );

    }
);


// =====================================================
// KIRIM CONTROL
// =====================================================

function sendControl(
    command,
    value
) {

    if (!client.connected) {

        console.warn(
            "MQTT belum terhubung."
        );

        return;
    }


    const payload = {
        command: command,
        value: Number(value)
    };


    client.publish(
        MQTT_CONTROL_TOPIC,
        JSON.stringify(payload)
    );


    console.log(
        "CONTROL:",
        payload
    );
}


// =====================================================
// NORMALISASI NILAI
// =====================================================

function normalizeADC(value) {

    let number =
        Number(value);


    if (!Number.isFinite(number)) {
        return 0;
    }


    number =
        Math.round(number);


    if (number < MIN_ADC) {
        number = MIN_ADC;
    }


    if (number > MAX_ADC) {
        number = MAX_ADC;
    }


    return number;
}


// =====================================================
// UPDATE DISPLAY WEB
// =====================================================

function updateWebDisplay(value) {

    const number =
        normalizeADC(value);


    if (!inputFocused) {

        webInput.value =
            number;

    }


    webAdcValue.textContent =
        number;
}


// =====================================================
// INPUT FOCUS
// =====================================================

webInput.addEventListener(
    "focus",
    function () {

        inputFocused = true;

    }
);


webInput.addEventListener(
    "blur",
    function () {

        inputFocused = false;

        let value =
            normalizeADC(
                webInput.value
            );


        webInput.value =
            value;

        webAdcValue.textContent =
            value;

    }
);


// =====================================================
// KETIKA MENGETIK
// =====================================================

webInput.addEventListener(
    "input",
    function () {

        // Jangan langsung paksa kembali ke 0
        // ketika input sedang kosong.

        if (this.value === "") {

            webAdcValue.textContent = "0";

            return;
        }


        let value =
            Number(this.value);


        if (!Number.isFinite(value)) {
            return;
        }


        if (value < MIN_ADC) {
            value = MIN_ADC;
        }


        if (value > MAX_ADC) {
            value = MAX_ADC;
        }


        webAdcValue.textContent =
            Math.round(value);

    }
);


// =====================================================
// ENTER = KIRIM NILAI
// =====================================================

webInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            sendWebValue();

            this.blur();
        }

    }
);


// =====================================================
// SEND WEB VALUE
// =====================================================

function sendWebValue() {

    let value =
        normalizeADC(
            webInput.value
        );


    webInput.value =
        value;


    webAdcValue.textContent =
        value;


    sendControl(
        "WEB",
        value
    );


    controlMode.textContent =
        "WEB";


    controlMode.className =
        "mode-badge web";


    webControlButton.textContent =
        "WEB AKTIF";

}


// =====================================================
// TOMBOL AKTIFKAN WEB
// =====================================================

webControlButton.addEventListener(
    "click",
    function () {

        sendWebValue();

    }
);


// =====================================================
// TOMBOL MINUS
// =====================================================

minusButton.addEventListener(
    "click",
    function () {

        let value =
            normalizeADC(
                webInput.value
            );


        value -= 100;


        value =
            normalizeADC(value);


        webInput.value =
            value;


        webAdcValue.textContent =
            value;


        sendControl(
            "WEB",
            value
        );


        controlMode.textContent =
            "WEB";


        controlMode.className =
            "mode-badge web";


        webControlButton.textContent =
            "WEB AKTIF";

    }
);


// =====================================================
// TOMBOL PLUS
// =====================================================

plusButton.addEventListener(
    "click",
    function () {

        let value =
            normalizeADC(
                webInput.value
            );


        value += 100;


        value =
            normalizeADC(value);


        webInput.value =
            value;


        webAdcValue.textContent =
            value;


        sendControl(
            "WEB",
            value
        );


        controlMode.textContent =
            "WEB";


        controlMode.className =
            "mode-badge web";


        webControlButton.textContent =
            "WEB AKTIF";

    }
);


// =====================================================
// RESET KE MANUAL
// =====================================================

resetButton.addEventListener(
    "click",
    function () {

        sendControl(
            "RESET",
            0
        );


        controlMode.textContent =
            "MANUAL";


        controlMode.className =
            "mode-badge manual";


        webControlButton.textContent =
            "AKTIFKAN WEB";

    }
);


// =====================================================
// MQTT MESSAGE
// =====================================================

client.on(
    "message",
    function (
        topic,
        message
    ) {

        if (
            topic !== MQTT_DATA_TOPIC
        ) {
            return;
        }


        try {

            const data =
                JSON.parse(
                    message.toString()
                );


            console.log(
                "DATA MQTT:",
                data
            );


            // =========================================
            // ADC MANUAL
            // =========================================

            const potManual =
                Number(
                    data.potManual
                );


            if (
                Number.isFinite(
                    potManual
                )
            ) {

                manualAdcElement.textContent =
                    Math.round(
                        potManual
                    );
            }


            // =========================================
            // ADC CONTROL
            // =========================================

            const controlAdc =
                Number(
                    data.controlAdc
                );


            if (
                Number.isFinite(
                    controlAdc
                )
            ) {

                adcElement.textContent =
                    Math.round(
                        controlAdc
                    );


                // Jangan timpa input saat user
                // sedang mengetik.

                if (!inputFocused) {

                    webInput.value =
                        Math.round(
                            controlAdc
                        );

                    webAdcValue.textContent =
                        Math.round(
                            controlAdc
                        );
                }

            }


            // =========================================
            // MODE
            // =========================================

            const mode =
                data.controlMode ||
                "MANUAL";


            controlMode.textContent =
                mode;


            if (
                mode === "WEB"
            ) {

                controlMode.className =
                    "mode-badge web";


                webControlButton.textContent =
                    "WEB AKTIF";

            } else {

                controlMode.className =
                    "mode-badge manual";


                webControlButton.textContent =
                    "AKTIFKAN WEB";

            }


            // =========================================
            // PWM
            // =========================================

            const pwm =
                Number(
                    data.pwm
                ) || 0;


            pwmElement.textContent =
                Math.round(pwm);


            // =========================================
            // SPEED
            // =========================================

            const speed =
                Number(
                    data.speedPercent
                ) || 0;


            speedElement.textContent =
                speed.toFixed(0);


            // =========================================
            // RPM
            // =========================================

            const receivedRPM =
                Number(
                    data.rpm
                );


            const rpm =
                Number.isFinite(
                    receivedRPM
                )
                    ? receivedRPM
                    : Math.round(
                        (
                            speed /
                            100
                        ) *
                        MAX_RPM
                    );


            rpmElement.textContent =
                rpm;


            // =========================================
            // ACCELEROMETER
            // =========================================

            const x =
                Number(
                    data.accelX
                );


            const y =
                Number(
                    data.accelY
                );


            const z =
                Number(
                    data.accelZ
                );


            if (

                Number.isFinite(x) &&
                Number.isFinite(y) &&
                Number.isFinite(z)

            ) {

                document.getElementById(
                    "accelX"
                ).textContent =
                    x.toFixed(2);


                document.getElementById(
                    "accelY"
                ).textContent =
                    y.toFixed(2);


                document.getElementById(
                    "accelZ"
                ).textContent =
                    z.toFixed(2);


                // =====================================
                // RESULTANT
                // =====================================

                const acceleration =
                    Math.sqrt(
                        (x * x) +
                        (y * y) +
                        (z * z)
                    );


                document.getElementById(
                    "acceleration"
                ).textContent =
                    acceleration.toFixed(2);


                document.getElementById(
                    "magnitude"
                ).textContent =
                    acceleration.toFixed(2);


                // =====================================
                // TIME
                // =====================================

                const now =
                    performance.now();


                if (
                    startTime === null
                ) {

                    startTime =
                        now;
                }


                const elapsed =
                    (
                        now -
                        startTime
                    ) / 1000;


                // Tidak lagi mencoba mengisi
                // elemen #time yang tidak ada.


                // =====================================
                // BUFFER
                // =====================================

                signalBuffer.push(
                    acceleration
                );


                timeBuffer.push(
                    elapsed
                );


                if (
                    signalBuffer.length >
                    MAX_BUFFER
                ) {

                    signalBuffer.shift();

                    timeBuffer.shift();
                }


                // =====================================
                // UPDATE GRAFIK
                // =====================================

                if (
                    accelerationChart
                ) {

                    accelerationChart
                        .data
                        .labels
                        .push(
                            elapsed.toFixed(2)
                        );


                    accelerationChart
                        .data
                        .datasets[0]
                        .data
                        .push(
                            acceleration
                        );


                    if (
                        accelerationChart
                            .data
                            .labels
                            .length > 50
                    ) {

                        accelerationChart
                            .data
                            .labels
                            .shift();


                        accelerationChart
                            .data
                            .datasets[0]
                            .data
                            .shift();
                    }


                    accelerationChart.update(
                        "none"
                    );


                    chartStatus.textContent =
                        "● Live Data";


                    chartStatus.className =
                        "chart-live";
                }

            }


            // =========================================
            // GYROSCOPE
            // =========================================

            const gyroX =
                Number(
                    data.gyroX
                );


            const gyroY =
                Number(
                    data.gyroY
                );


            const gyroZ =
                Number(
                    data.gyroZ
                );


            document.getElementById(
                "gyroX"
            ).textContent =

                Number.isFinite(
                    gyroX
                )
                    ? gyroX.toFixed(2)
                    : "0.00";


            document.getElementById(
                "gyroY"
            ).textContent =

                Number.isFinite(
                    gyroY
                )
                    ? gyroY.toFixed(2)
                    : "0.00";


            document.getElementById(
                "gyroZ"
            ).textContent =

                Number.isFinite(
                    gyroZ
                )
                    ? gyroZ.toFixed(2)
                    : "0.00";


            // =========================================
            // TEMPERATURE
            // =========================================

            const temperature =
                Number(
                    data.temperature
                );


            document.getElementById(
                "temperature"
            ).textContent =

                Number.isFinite(
                    temperature
                )
                    ? temperature.toFixed(2)
                    : "0.00";


            // =========================================
            // STATUS
            // =========================================

            sensorStatus.textContent =
                "Data diterima";


            dataCount++;

            dataCounter.textContent =
                dataCount;


            lastUpdate.textContent =
                new Date()
                    .toLocaleTimeString(
                        "id-ID"
                    );

        }

        catch (error) {

            console.error(
                "ERROR MQTT DATA:",
                error
            );

            console.log(
                "Pesan:",
                message.toString()
            );

        }

    }
);


// =====================================================
// MQTT ERROR
// =====================================================

client.on(
    "error",
    function (error) {

        console.error(
            "MQTT ERROR:",
            error
        );

        mqttStatus.textContent =
            "● MQTT Error";

        mqttStatus.className =
            "status disconnected";

    }
);


// =====================================================
// MQTT RECONNECT
// =====================================================

client.on(
    "reconnect",
    function () {

        mqttStatus.textContent =
            "● Connecting...";

        mqttStatus.className =
            "status disconnected";

    }
);


// =====================================================
// MQTT CLOSE
// =====================================================

client.on(
    "close",
    function () {

        mqttStatus.textContent =
            "● MQTT Disconnected";

        mqttStatus.className =
            "status disconnected";

    }
);