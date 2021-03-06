import { decl, colors, css } from 'styletakeout.macro';
import { otherStyles } from './imported.js';

const exportedVariable = colors.blue.c400;
const styles = css`
  padding: 15px;
  background-color: ${colors.blue.c500};
  ${decl.multiline}
  /* Note that .lg and .md error since TS can't ensure they're defined */
  margin-top: ${decl.size.lg};
  margin-left: ${decl.size.md};
  margin-right: ${decl.size.sm};
`;

console.log(styles);
console.log(decl.primaryPurpleAccent);
console.log(otherStyles);

// These are simplified into strings as expected
`m5 p5 ${css`vertical-align: middle`} align-center ${styles}`;
`m5 p5 ${css`vertical-align: middle`} align-center`;
`m5 p5 ${styles} ${css`vertical-align: middle`} align-center ${styles}`;
`${styles} ${css`vertical-align: middle`}`;
`${css`vertical-align: middle`}`;
`${css`vertical-align: middle`} hello`;
