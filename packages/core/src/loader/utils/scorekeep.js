export function randomUserName() {
    return `user${Math.floor(Math.random() * 1000)}`;
}
export function randomSessionName() {
    return `session${Math.floor(Math.random() * 1000)}`;
}
export function randomGameName() {
    return `game${Math.floor(Math.random() * 1000)}`;
}
export function randomGameRules() {
    return 'TicTacToe';
}

export async function run() {
    let session;
    let game;
    const username = randomUserName();
    const sessionname = randomSessionName();
    const gamename = randomGameName();
    const rules = randomGameRules();
    const user = await createUser(username);
    session = await createSession();
    session = await updateSession(session.id, sessionname, username);
    game = await createGame(session.id);
    game = await updateGame(game.id, game.session, gamename, rules, [user.id]);
    await setRules(game.id, game.session);
    await startGame(game.id, game.session);
    game = await getInitialState(game.id, game.session);
    await play(session.id, game.id, user.id, 'X1');
    await play(session.id, game.id, user.id, 'O2');
    await play(session.id, game.id, user.id, 'X3');
    await play(session.id, game.id, user.id, 'O4');
    await play(session.id, game.id, user.id, 'X5');
    await play(session.id, game.id, user.id, 'O6');
    await play(session.id, game.id, user.id, 'X7');
}

export async function createUser(username) {
    const response = await fetch(
        'http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/user',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({ name: username })
        }
    );
    // Example response: {"id":"JVTUDFG6","name":"myuser"}
    return response.json();
}

export async function createSession() {
    const response = await fetch(
        'http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/session',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({})
        }
    );
    // Example response: {"id":"2HM515LD","owner":null,"name":null,"users":null,"games":null}
    return response.json();
}

export async function updateSession(sessionId, sessionName, ownerId) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/session/${sessionId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({
                id: sessionId,
                owner: ownerId,
                name: sessionName,
                users: null,
                games: null
            })
        }
    );
    // Example response: {"id":"2HM515LD","owner":"JVTUDFG6","name":"games","users":null,"games":null}
    return response.json();
}

export async function createGame(sessionId) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/game/${sessionId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({})
        }
    );
    // Example response: {"id":"QJ57AQDR","session":"2HM515LD","name":null,"users":null,"rules":null,"startTime":null,"endTime":null,"states":null,"moves":null}
    return response.json();
}

export async function updateGame(gameId, sessionId, gameName, rules, users) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/game/${sessionId}/${gameId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({
                id: gameId,
                session: sessionId,
                name: gameName,
                users: users,
                rules: rules,
                startTime: Date.now()
            })
        }
    );
    // Example response: {"id":"2HM515LD","owner":"JVTUDFG6","name":"games","users":null,"games":null}
    return response.json();
}

export async function setRules(gameId, sessionId) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/game/${sessionId}/${gameId}/rules/TicTacToe`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        }
    );
}

export async function startGame(gameId, sessionId) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/game/${sessionId}/${gameId}/starttime/${Date.now()}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        }
    );
}

export async function getInitialState(gameId, sessionId) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/game/${sessionId}/${gameId}`,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        }
    );
    // Example response: {"id":"GC07VRGC","session":"6ROKMJ04","name":"game340","users":["2DTM9BEB"],"rules":"TicTacToe","startTime":1621296353039,"endTime":null,"states":["H6VPUAUU"],"moves":null}
    return response.json();
}

export async function play(sessionId, gameId, userId, move) {
    const response = await fetch(
        `http://scorekeep-env.eba-mi3pgqai.us-west-2.elasticbeanstalk.com/api/move/${sessionId}/${gameId}/${userId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: move
        }
    );
    // Example response: {"id":"HI2TEC22","game":"MHU803QE","session":"2IA03FM","user":"TECIPULQ","move":"X7"}
    return response.json();
}
