// Conformance demo page for MUI (Material UI). Each section renders one contract with MUI's
// own components. Where MUI's documentation tells the app to supply ARIA wiring (menu and
// popover trigger attributes, the tab panel, sort state), the demo copies the documented
// pattern and nothing more. MUI has no site-navigation component; see adapter.json.
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Menu from '@mui/material/Menu';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import Pagination from '@mui/material/Pagination';

function ButtonDemo() {
  const [bold, setBold] = useState(false);
  return (
    <>
      <Button variant="contained" id="mui-save">Save draft</Button>
      <ToggleButton value="bold" id="mui-bold" selected={bold} onChange={() => setBold(!bold)}>Bold</ToggleButton>
      <Button variant="contained" id="mui-off" disabled>Publish</Button>
    </>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button id="mui-dialog-open" onClick={() => setOpen(true)}>Rename project</Button>
      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="mui-dialog-title" aria-describedby="mui-dialog-desc">
        <DialogTitle id="mui-dialog-title">Rename project</DialogTitle>
        <DialogContent>
          <DialogContentText id="mui-dialog-desc">Pick a name your team will recognise.</DialogContentText>
          <TextField autoFocus label="Project name" defaultValue="Atlas" margin="dense" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function MenuDemo() {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);
  const close = () => setAnchor(null);
  return (
    <>
      <Button id="mui-menu-btn" aria-controls={open ? 'mui-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : 'false'} onClick={(e) => setAnchor(e.currentTarget)}>Actions</Button>
      <Menu id="mui-menu" anchorEl={anchor} open={open} onClose={close} slotProps={{ list: { 'aria-labelledby': 'mui-menu-btn' } }}>
        <MenuItem onClick={close}>Duplicate</MenuItem>
        <MenuItem onClick={close}>Archive</MenuItem>
        <MenuItem onClick={close}>Delete</MenuItem>
      </Menu>
    </>
  );
}

const tabNames = ['Plan', 'Invoices', 'Payment'];
const tabText = ['You are on the monthly plan.', 'No invoices yet.', 'Card ending 4242.'];
function TabsDemo() {
  const [value, setValue] = useState(0);
  return (
    <>
      <Tabs id="mui-tabs" value={value} onChange={(_, v) => setValue(v)} aria-label="Billing">
        {tabNames.map((n, i) => <Tab key={n} label={n} id={`mui-tab-${i}`} aria-controls={`mui-tabpanel-${i}`} />)}
      </Tabs>
      {tabNames.map((n, i) => (
        <div key={n} role="tabpanel" hidden={value !== i} id={`mui-tabpanel-${i}`} aria-labelledby={`mui-tab-${i}`}>
          {value === i && <p>{tabText[i]}</p>}
        </div>
      ))}
    </>
  );
}

function TooltipPopoverDemo() {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);
  return (
    <>
      <Tooltip describeChild title="Copies the share link"><Button id="mui-tip-btn">Copy link</Button></Tooltip>
      <Button id="mui-pop-btn" aria-controls={open ? 'mui-popover' : undefined} aria-expanded={open ? 'true' : 'false'} aria-haspopup="dialog" onClick={(e) => setAnchor(e.currentTarget)}>Filters</Button>
      <Popover id="mui-popover" open={open} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <div style={{ padding: 16 }}>
          <label><input type="checkbox" /> Only open items</label>
          <Button onClick={() => setAnchor(null)}>Done</Button>
        </div>
      </Popover>
    </>
  );
}

function ToastDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button id="mui-toast-btn" onClick={() => { setOpen(false); setTimeout(() => setOpen(true), 0); }}>Save settings</Button>
      <Snackbar
        className="mui-toast"
        open={open}
        autoHideDuration={10000}
        onClose={(_, reason) => { if (reason !== 'clickaway') setOpen(false); }}
        message="Settings saved."
        action={<IconButton size="small" aria-label="Dismiss notification" color="inherit" onClick={() => setOpen(false)}>×</IconButton>}
      />
    </>
  );
}

const people = [
  { name: 'Ada', role: 'Engineer' }, { name: 'Grace', role: 'Admiral' }, { name: 'Margaret', role: 'Director' },
  { name: 'Barbara', role: 'Professor' }, { name: 'Karen', role: 'Researcher' }
];
function TableDemo() {
  const [order, setOrder] = useState(null);
  const [filter, setFilter] = useState('');
  const rows = useMemo(() => {
    const r = people.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
    if (order) r.sort((a, b) => (order === 'asc' ? 1 : -1) * a.name.localeCompare(b.name));
    return r;
  }, [order, filter]);
  return (
    <>
      <TextField id="mui-filter" label="Filter by name" value={filter} onChange={(e) => setFilter(e.target.value)} margin="dense" />
      <Table id="mui-table">
        <TableHead>
          <TableRow>
            <TableCell sortDirection={order ?? false}>
              <TableSortLabel id="mui-sort" active={Boolean(order)} direction={order ?? 'asc'} onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}>Name</TableSortLabel>
            </TableCell>
            <TableCell>Role</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((p) => <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell>{p.role}</TableCell></TableRow>)}
        </TableBody>
      </Table>
    </>
  );
}

function App() {
  const [fruit, setFruit] = useState('apple');
  return (
    <main id="demo">
      <h1>MUI conformance demo</h1>

      <section id="c-button" aria-labelledby="h-button">
        <h2 id="h-button">Button and ToggleButton</h2>
        <ButtonDemo />
      </section>

      <section id="c-text-field" aria-labelledby="h-text-field">
        <h2 id="h-text-field">Text field</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField id="mui-email" name="email" type="email" label="Email address" required helperText="We only use this for receipts." />
          <Button type="submit" id="mui-email-submit">Save email</Button>
        </form>
      </section>

      <section id="c-select" aria-labelledby="h-select">
        <h2 id="h-select">Select</h2>
        <FormControl>
          <InputLabel id="mui-fruit-label">Fruit</InputLabel>
          <Select labelId="mui-fruit-label" id="mui-select" value={fruit} label="Fruit" onChange={(e) => setFruit(e.target.value)}>
            <MenuItem value="apple">Apple</MenuItem>
            <MenuItem value="banana">Banana</MenuItem>
            <MenuItem value="cherry">Cherry</MenuItem>
          </Select>
        </FormControl>
      </section>

      <section id="c-dialog" aria-labelledby="h-dialog">
        <h2 id="h-dialog">Dialog</h2>
        <DialogDemo />
      </section>

      <section id="c-menu" aria-labelledby="h-menu">
        <h2 id="h-menu">Menu</h2>
        <MenuDemo />
      </section>

      <section id="c-tabs" aria-labelledby="h-tabs">
        <h2 id="h-tabs">Tabs</h2>
        <TabsDemo />
      </section>

      <section id="c-tooltip" aria-labelledby="h-tooltip">
        <h2 id="h-tooltip">Tooltip and popover</h2>
        <TooltipPopoverDemo />
      </section>

      <section id="c-accordion" aria-labelledby="h-accordion">
        <h2 id="h-accordion">Accordion</h2>
        <Accordion defaultExpanded>
          <AccordionSummary className="acc" id="mui-acc-1" aria-controls="mui-acc-1-panel">Shipping</AccordionSummary>
          <AccordionDetails>Ships in two days.</AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary className="acc" id="mui-acc-2" aria-controls="mui-acc-2-panel">Returns</AccordionSummary>
          <AccordionDetails>Thirty days, no questions.</AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary className="acc" id="mui-acc-3" aria-controls="mui-acc-3-panel">Warranty</AccordionSummary>
          <AccordionDetails>One year.</AccordionDetails>
        </Accordion>
      </section>

      <section id="c-toast" aria-labelledby="h-toast">
        <h2 id="h-toast">Snackbar</h2>
        <ToastDemo />
      </section>

      <section id="c-table" aria-labelledby="h-table">
        <h2 id="h-table">Table with sort label</h2>
        <TableDemo />
      </section>

      <section id="c-pagination" aria-labelledby="h-pagination">
        <h2 id="h-pagination">Pagination</h2>
        <Pagination id="mui-pagination" count={5} defaultPage={2} />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
