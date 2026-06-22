const Expense = require('../models/Expense');
const BankAccount = require('../models/BankAccount');

// @desc    Get all expenses/transactions for current user (sorted by date descending)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.uid }).sort({ dateTime: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add or Update (Upsert) an expense/transaction
// @route   POST /api/expenses
// @access  Private
const saveExpense = async (req, res) => {
  try {
    const { id, amount, category, dateTime, accountId, note, isIncome } = req.body;

    if (!id || !amount || !category || !dateTime || !accountId || isIncome === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields (id, amount, category, dateTime, accountId, isIncome)' });
    }

    // 1. Revert previous balance impact if this is an update
    const oldExpense = await Expense.findOne({ id, userId: req.user.uid });
    if (oldExpense) {
      const oldAccount = await BankAccount.findOne({ id: oldExpense.accountId, userId: req.user.uid });
      if (oldAccount) {
        const revertAdjustment = oldExpense.isIncome ? -oldExpense.amount : oldExpense.amount;
        oldAccount.balance += revertAdjustment;
        await oldAccount.save();
      }
    }

    // 2. Apply new balance impact
    const newAccount = await BankAccount.findOne({ id: accountId, userId: req.user.uid });
    if (!newAccount) {
      return res.status(404).json({ message: `Associated Bank Account with ID ${accountId} not found` });
    }
    const applyAdjustment = isIncome ? amount : -amount;
    newAccount.balance += applyAdjustment;
    await newAccount.save();

    // 3. Save/Update the expense
    const expense = await Expense.findOneAndUpdate(
      { id, userId: req.user.uid },
      { id, amount, category, dateTime, accountId, note, isIncome, userId: req.user.uid },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an expense/transaction and revert the associated account balance
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the expense first to know what account and amount to revert
    const expense = await Expense.findOne({ id, userId: req.user.uid });
    if (!expense) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Revert the balance on the associated bank account
    const account = await BankAccount.findOne({ id: expense.accountId, userId: req.user.uid });
    if (account) {
      // If it was income, subtract it. If it was an expense, add it back.
      const adjustment = expense.isIncome ? -expense.amount : expense.amount;
      account.balance += adjustment;
      await account.save();
    }

    // Delete the transaction document
    await Expense.deleteOne({ id, userId: req.user.uid });

    res.status(200).json({ message: 'Transaction deleted and balance reverted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export expenses to PDF based on accountId and date range
// @route   GET /api/expenses/export
// @access  Private
const exportExpenses = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { accountId, startDate, endDate } = req.query;

    const query = { userId: req.user.uid };
    if (accountId && accountId !== 'All') {
      query.accountId = accountId;
    }
    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) {
        query.dateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.dateTime.$lte = new Date(endDate);
      }
    }

    const expenses = await Expense.find(query).sort({ dateTime: -1 });
    const accounts = await BankAccount.find({ userId: req.user.uid });

    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.id] = acc.name;
    });

    // Calculate Summary stats
    let totalIncome = 0;
    let totalExpense = 0;
    expenses.forEach(exp => {
      if (exp.isIncome) {
        totalIncome += exp.amount;
      } else {
        totalExpense += exp.amount;
      }
    });
    const netSavings = totalIncome - totalExpense;

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    // Stream the PDF directly to the response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_report.pdf');
    doc.pipe(res);

    // --- Header ---
    doc.fillColor('#6200EE').fontSize(24).text('Finance Flow', 50, 50, { bold: true });
    doc.fillColor('#333333').fontSize(14).text('Transaction History Report', 50, 80);
    
    // Add date range info
    let filterInfo = `Account: ${accountId && accountId !== 'All' ? (accountMap[accountId] || accountId) : 'All Accounts'}`;
    if (startDate && endDate) {
      const sDate = new Date(startDate).toLocaleDateString();
      const eDate = new Date(endDate).toLocaleDateString();
      filterInfo += ` | Period: ${sDate} - ${eDate}`;
    } else if (startDate) {
      const sDate = new Date(startDate).toLocaleDateString();
      filterInfo += ` | Starting from: ${sDate}`;
    } else if (endDate) {
      const eDate = new Date(endDate).toLocaleDateString();
      filterInfo += ` | Up to: ${eDate}`;
    }
    doc.fillColor('#666666').fontSize(10).text(filterInfo, 50, 105);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 120);

    // Divider Line
    doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, 135).lineTo(545, 135).stroke();

    // --- Summary Section ---
    doc.fillColor('#333333').fontSize(12).text('Financial Summary', 50, 155, { bold: true });

    // Draw Income Card
    doc.roundedRect(50, 175, 150, 60, 8).fillColor('#E8F5E9').fill();
    doc.fillColor('#2E7D32').fontSize(10).text('TOTAL INCOME', 60, 185);
    doc.fontSize(14).text(`+ ₹${totalIncome.toFixed(2)}`, 60, 205, { bold: true });

    // Draw Expense Card
    doc.roundedRect(215, 175, 150, 60, 8).fillColor('#FFEBEE').fill();
    doc.fillColor('#C62828').fontSize(10).text('TOTAL EXPENSE', 225, 185);
    doc.fontSize(14).text(`- ₹${totalExpense.toFixed(2)}`, 225, 205, { bold: true });

    // Draw Net Savings Card
    doc.roundedRect(380, 175, 165, 60, 8).fillColor(netSavings >= 0 ? '#E8EAF6' : '#FFF3E0').fill();
    doc.fillColor(netSavings >= 0 ? '#283593' : '#EF6C00').fontSize(10).text('NET BALANCE', 390, 185);
    doc.fontSize(14).text(`${netSavings >= 0 ? '+' : '-'} ₹${Math.abs(netSavings).toFixed(2)}`, 390, 205, { bold: true });

    // Divider Line
    doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, 255).lineTo(545, 255).stroke();

    // --- Table Section ---
    doc.fillColor('#333333').fontSize(12).text('Transactions List', 50, 275, { bold: true });

    // Table Headers
    const tableTop = 295;
    doc.fontSize(10).fillColor('#555555');
    doc.text('Date', 50, tableTop, { bold: true });
    doc.text('Category', 150, tableTop, { bold: true });
    doc.text('Account', 260, tableTop, { bold: true });
    doc.text('Note', 350, tableTop, { bold: true });
    doc.text('Amount', 470, tableTop, { width: 75, align: 'right', bold: true });

    // Header Underline
    doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(50, 310).lineTo(545, 310).stroke();

    let y = 320;
    expenses.forEach((exp) => {
      // If we are reaching the bottom of the page, add a new page
      if (y > 720) {
        doc.addPage();
        y = 50; // reset y to top margin of the new page
        // Redraw table headers on new page
        doc.fontSize(10).fillColor('#555555');
        doc.text('Date', 50, y, { bold: true });
        doc.text('Category', 150, y, { bold: true });
        doc.text('Account', 260, y, { bold: true });
        doc.text('Note', 350, y, { bold: true });
        doc.text('Amount', 470, y, { width: 75, align: 'right', bold: true });
        doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(50, y + 15).lineTo(545, y + 15).stroke();
        y += 25;
      }

      const dateStr = new Date(exp.dateTime).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const accName = accountMap[exp.accountId] || 'Unknown';
      const amountStr = `${exp.isIncome ? '+' : '-'} ₹${exp.amount.toFixed(2)}`;

      doc.fillColor('#333333').fontSize(9);
      doc.text(dateStr, 50, y);
      doc.text(exp.category, 150, y);
      doc.text(accName, 260, y);
      doc.text(exp.note || '-', 350, y, { width: 110, height: 25, ellipsis: true });

      // Amount color coding
      doc.fillColor(exp.isIncome ? '#2E7D32' : '#C62828');
      doc.text(amountStr, 470, y, { width: 75, align: 'right' });

      // Row separator line
      doc.strokeColor('#EEEEEE').lineWidth(0.5).moveTo(50, y + 15).lineTo(545, y + 15).stroke();

      y += 22;
    });

    // Add Page Number Footer dynamically
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#888888').fontSize(8);
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        780,
        { align: 'center', width: 495 }
      );
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  saveExpense,
  deleteExpense,
  exportExpenses,
};
