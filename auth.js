// --- Login ID Configuration ---

const LOGIN_EMAIL_BASE = "infoaqms786";

const LOGIN_EMAIL_DOMAIN = "gmail.com";

const idToEmail = id =>
    `${LOGIN_EMAIL_BASE}+${id}@${LOGIN_EMAIL_DOMAIN}`;


// --- Owner Authorization ---

async function owner() {

    const { data: { user } } =
        await sb.auth.getUser();

    if (!user) return false;

    const account = await query(

        sb.from('website_owners')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle()

    );

    return !!account;

}


// --- Protected Operations ---

async function requireOwner() {

    if (!await owner()) {

        throw Error('Owner login required');

    }

}