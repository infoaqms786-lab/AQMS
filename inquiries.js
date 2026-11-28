
 // --- Inquiry State ---

let inquirySubmitting = false;


// --- Inquiry Tray ---

function addToTray(label) {

    if (inquirySubmitting) return;

    if (!tray.includes(label)) {
        tray.push(label);
    }

    $('trayCount').textContent = tray.length;
}


function removeFromTray(idx) {

    if (inquirySubmitting) return;

    tray.splice(idx, 1);

    $('trayCount').textContent = tray.length;

    renderTray();
}


function renderTray() {

    const box = $('trayItems');

    if (!tray.length) {

        box.innerHTML = `
            <p style="color:var(--muted); font-size:0.9rem;">
                No specific SKUs selected yet.
                You can still submit a general bulk inquiry below.
            </p>
        `;

        return;
    }

    box.innerHTML = tray.map((item, i) => `

        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            padding:0.5rem 0.75rem;
            background:var(--surface-2);
            border-radius:8px;
            margin-bottom:0.4rem;
            font-size:0.86rem;
        ">

            <span>${esc(item)}</span>

            <button type="button"
                    onclick="removeFromTray(${i})"
                    style="
                        background:none;
                        border:none;
                        color:#c0392b;
                        cursor:pointer;
                    ">
                Remove
            </button>

        </div>

    `).join("");
}


function openTray() {

    renderTray();

    $('trayModal').classList.add("open");
}


// --- Prepare Inquiry Data ---

function buildInquiryPayload() {

    return {

        name: $('inqName').value.trim(),

        company: $('inqCompany').value.trim(),

        email: $('inqEmail').value.trim(),

        phone: $('inqPhone').value.trim(),

        notes: $('inqNotes').value.trim(),

        items: tray.length
            ? [...tray]
            : ["General Bulk Catalog Inquiry"]

    };
}


// --- Inquiry Validation ---

function validateInquiry(data) {

    if (!data.name || data.name.length > 100) {
        throw Error("Enter a valid full name.");
    }

    if (!data.company || data.company.length > 150) {
        throw Error("Enter a valid company name.");
    }

    if (!data.email || data.email.length > 254) {
        throw Error("Enter a valid business email.");
    }

    const digits = data.phone.replace(/\D/g, "");

    if (
        !/^\+?[\d\s().-]+$/.test(data.phone) ||
        digits.length < 7 ||
        digits.length > 15
    ) {
        throw Error("Enter a valid phone number with country code.");
    }

    if (data.notes.length > 2000) {
        throw Error("Notes must not exceed 2000 characters.");
    }
}


// --- Status Messages ---

function inquiryMessage(message, type = "") {

    const status = $('inquiryStatus');

    status.textContent = message;

    status.className = type
        ? "message-" + type
        : "";
}


// --- Loading State ---

function setInquiryBusy(busy) {

    inquirySubmitting = busy;

    const form = $('inquiryForm');

    form.setAttribute("aria-busy", String(busy));

    form.querySelectorAll(
        "input, textarea, button"
    ).forEach(element => {

        element.disabled = busy;

    });

    $('trayItems').querySelectorAll("button")
        .forEach(button => {

            button.disabled = busy;

        });
}


// --- Reset Inquiry ---

function resetInquiry() {

    tray = [];

    $('trayCount').textContent = "0";

    $('inquiryForm').reset();

    renderTray();
}


// --- Shared Submission Function ---

async function submitInquiry(channel) {

    if (inquirySubmitting) return;

    const form = $('inquiryForm');

    inquiryMessage("");

    if (!form.reportValidity()) return;

    let data;

    try {

        data = buildInquiryPayload();

        validateInquiry(data);

    } catch (err) {

        inquiryMessage(err.message, "error");

        return;
    }

    const message =
        `Hello AQMS,\n\n` +
        `New B2B Product Inquiry:\n\n` +
        `Name: ${data.name}\n` +
        `Company: ${data.company}\n` +
        `Email: ${data.email}\n` +
        `Phone: ${data.phone}\n\n` +
        `Requested Items:\n- ${data.items.join("\n- ")}\n\n` +
        `Notes: ${data.notes || "N/A"}`;

    const destination = channel === "whatsapp"

        ? `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`

        : `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(
            "B2B Inquiry from " + data.company
        )}&body=${encodeURIComponent(message)}`;

    setInquiryBusy(true);

    inquiryMessage(
        "Saving your inquiry...",
        "loading"
    );

    try {

        await query(

            sb.from("inquiries").insert({

                ...data,

                status: "New"

            })

        );

    } catch (err) {

        console.error("Inquiry error:", err);

        inquiryMessage(
            "Unable to confirm your inquiry was saved. Please contact our commercial desk before retrying.",
            "error"
        );

        setInquiryBusy(false);

        return;
    }

    resetInquiry();

    setInquiryBusy(false);

    inquiryMessage(
        "Inquiry saved successfully.",
        "success"
    );

    window.location.href = destination;
}


// --- WhatsApp Submission ---

$('inquiryForm').addEventListener("submit", e => {

    e.preventDefault();

    submitInquiry("whatsapp");

});


// --- Email Submission ---

function submitEmailInquiry() {

    return submitInquiry("email");
}
