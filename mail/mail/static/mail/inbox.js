document.addEventListener('DOMContentLoaded', function() {

    // Use buttons to toggle between views
    document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
    document.querySelector('#compose').addEventListener('click', compose_email);

    // By default, load the inbox
    load_mailbox('inbox');
});

function compose_email() {

    // Show compose view and hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';

    // Clear out composition fields
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';

    // Disable submit button initially
    document.querySelector('#compose-submit').disabled = true;

    // Enable submit button at the right time
    document.querySelector('#compose-subject').onkeyup = () => {
        if (document.querySelector('#compose-subject').value.length > 0 && document.querySelector('#compose-recipients').value.length > 0) {
            document.querySelector('#compose-submit').disabled = false;
        } else {
            document.querySelector('#compose-submit').disabled = true;
        }
    };

    document.querySelector('#compose-recipients').onkeyup = () => {
        if (document.querySelector('#compose-subject').value.length > 0 && document.querySelector('#compose-recipients').value.length > 0) {
            document.querySelector('#compose-submit').disabled = false;
        } else {
            document.querySelector('#compose-submit').disabled = true;
        }
    };

    // Handle form submission
    document.querySelector('form').onsubmit = (event) => {
        event.preventDefault(); // Prevent default form submission
        send_email();
    };
}

function load_mailbox(mailbox) {

    // Show the mailbox and hide other views
    document.querySelector('#emails-view').style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';

    // Show the mailbox name
    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

    box(mailbox);
}

function send_email() {

    // Store passing perimeters
    const to = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;

    // Compose an email
    fetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
            recipients: to,
            subject: subject,
            body: body
        })
    })

        // Check for appropriate connection
        .then(response => {
            if (!response.ok) {
                throw new Error('Connection was interrupted!');
            }

            return response.json();
        })

        // Report for progress
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else if (data.message) {
                alert(data.message);
                load_mailbox('sent');
            }
        })

        .catch(error => {
            console.error('Error fetching email API:', error);
            alert(error);
        });
}


function box(mailbox) {

    fetch(`emails/${mailbox}`)

        // Check for status range of 400-500
        .then(response => {
            if (!response.ok) {
                throw new Error('Connection was interrupted!');
            }

            return response.json();
        })

        // Load the email
        .then(packages => {
            for (let i = 0; i < packages.length; i++) {

                // Create a card for an email
                const card = document.createElement('div');
                if (!packages[i]['read']) {
                    card.classList.add('card', 'bg-light', 'text-dark');
                } else {
                    card.classList.add('card', 'bg-dark', 'text-white');
                }
                const body = document.createElement('div');
                body.classList.add('card-body', 'd-flex', 'justify-content-between', 'align-items-center');
                card.append(body);

                // Create a section for "sender"
                const sender = document.createElement('b');
                sender.innerText = packages[i]['sender'];
                body.append(sender);

                // Create a section for "subject"
                const subject = document.createElement('span');
                subject.innerText = packages[i]['subject'];
                body.append(subject);

                // Create a section for "timestamp"
                const timestamp = document.createElement('span');
                timestamp.classList.add('text-muted')
                timestamp.innerText = packages[i]['timestamp'];
                body.append(timestamp);

                // Break line
                const breakLine = document.createElement('br');

                // Append the card into the container
                document.querySelector('#emails-view').append(card, breakLine);

                // Listen for a call
                card.addEventListener('click', () => open_envelope(packages[i]['id'], mailbox));
            }
        })

        .catch(error => {
            console.error('Error caused while interacting with emails API:', error);
            alert(error);
        });
}

function open_envelope(id, method) {
    fetch(`/emails/${id}`)

        // Handle issued status code
        .then(response => {
            if (!response.ok) {
                throw new Error('Connection was interrupted!');
            }

            // Fetch an Promise for read email
            fetch(`/emails/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    read: true
                })
              });

            return response.json();
        })

        // Display the email
        .then(email => {
            const emailsView = document.querySelector('#emails-view');
            emailsView.innerHTML = ''; // Clear previous content

            const row = document.createElement('div');
            row.classList.add('row');

            const left = document.createElement('div');
            left.classList.add('col-10');
            row.append(left);

            const right = document.createElement('div');
            right.classList.add('col-2');
            right.style.display = 'flex';
            right.style.gap = '5px';
            row.append(right);

            const from = document.createElement('p');
            from.innerHTML = `<b>From:</b> `;
            from.appendChild(document.createTextNode(email['sender']));
            left.append(from);

            if (method != 'sent') {
                createArchiveButton(email, right);
            }

            const re = document.createElement('button');
            re.innerText = 'Reply';
            re.classList.add('btn', 'btn-outline-success', 'btn-sm');
            re.addEventListener('click', () => reply(email));
            right.append(re);

            const to = document.createElement('p');
            to.innerHTML = `<b>To:</b> `;
            to.appendChild(document.createTextNode(email['recipients'].join(', ')));

            const timestamp = document.createElement('p');
            timestamp.innerHTML = `<b>Timestamp:</b> `;
            timestamp.appendChild(document.createTextNode(email['timestamp']));

            const hr = document.createElement('hr');

            const body = document.createElement('p');
            body.textContent = email['body'];

            emailsView.append(row, to, timestamp, hr, body);
        })


        .catch(error => {
            console.error('Error caused while openning an envelope the API:', error);
            alert(error);
        });
}

function createArchiveButton(email, container) {
    const button = document.createElement('button');
    button.classList.add('btn', 'btn-outline-info', 'btn-sm');

    if (!email.archived) {
        button.innerText = 'Archive';
        button.addEventListener('click', () => {
            fetch(`/emails/${email.id}`, {
                method: 'PUT',
                body: JSON.stringify({ archived: true })
            });
            load_mailbox('inbox');
        });
    } else {
        button.innerText = 'Unarchive';
        button.addEventListener('click', () => {
            fetch(`/emails/${email.id}`, {
                method: 'PUT',
                body: JSON.stringify({ archived: false })
            });
            load_mailbox('inbox');
        });
    }

    container.append(button);
}

function reply(email) {
    compose_email();

    // Pre-fill the fields
    let subject = email['subject'];
    if (!subject.startsWith('Re: ')) {
        subject = 'Re: ' + subject;
    }

    document.querySelector('#compose-recipients').value = email['sender'];
    document.querySelector('#compose-subject').value = subject;
    document.querySelector('#compose-subject').disabled = true;
    document.querySelector('#compose-body').value = `\nOn ${email['timestamp']}, ${email['sender']} wrote:\n${email['body']}\n\n`;
    document.querySelector('#compose-submit').disabled = false;
    document.querySelector('#compose-recipients').disabled = true;
}
