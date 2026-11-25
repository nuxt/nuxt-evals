import git from 'eve/extensions/git';
import { authorize, brokerGitHubLease, CONNECTOR } from '../lib/github';

export default git({
  github: {
    connector: CONNECTOR,
    broker: brokerGitHubLease,
    principalType: 'app',
    authorize,
    permissions: ['contents:write', 'pull_requests:write', 'issues:write'],
  },
});
