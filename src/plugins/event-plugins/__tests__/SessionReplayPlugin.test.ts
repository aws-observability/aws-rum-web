import {
    SessionReplayPlugin,
    SESSION_REPLAY_EVENT_TYPE,
    eventWithTime
} from '../SessionReplayPlugin';
import { context, record } from '../../../test-utils/test-utils';
import {
    RUM_SESSION_START,
    RUM_SESSION_EXPIRE
} from '../../../sessions/SessionManager';
import { Topic } from '../../../event-bus/EventBus';
import * as rrweb from 'rrweb';
