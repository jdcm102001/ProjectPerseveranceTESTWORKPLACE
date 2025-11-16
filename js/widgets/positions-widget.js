import { GAME_STATE } from '../core/game-state.js';
import { showSaleDetails } from '../core/game-controls.js';

const PositionsWidget = {
    positions: [],

    init() {
        this.loadPositionsFromGameState();
        this.render();
    },

    loadPositionsFromGameState() {
        const combined = [];

        if (GAME_STATE.physicalPositions) {
            GAME_STATE.physicalPositions.forEach((pos, idx) => {
                const turnsRemaining = pos.arrivalTurn - GAME_STATE.currentTurn;
                const daysRemaining = Math.max(0, turnsRemaining * 30); // Rough estimate: 30 days per turn

                combined.push({
                    id: `BUY_${idx}`,
                    type: 'BUY',
                    loading: pos.originPort,
                    destination: pos.destinationPort || 'Unknown',
                    tonnage: pos.tonnage,
                    price: pos.costPerMT,
                    qp: 'M+1',
                    eta: daysRemaining,
                    etaDays: daysRemaining,
                    arrival: pos.status === 'ARRIVED' ? 'Arrived' :
                             pos.status === 'SOLD_PENDING_SETTLEMENT' ? 'Pending Settlement' : 'In Transit',
                    matchId: null,
                    soldInfo: pos.soldInfo
                });
            });
        }

        if (GAME_STATE.salesPositions) {
            GAME_STATE.salesPositions.forEach((pos, idx) => {
                combined.push({
                    id: `SELL_${idx}`,
                    type: 'SELL',
                    loading: 'N/A',
                    destination: pos.destinationPort,
                    tonnage: pos.tonnage,
                    price: pos.pricePerMT,
                    qp: 'M+1',
                    eta: pos.arrivalTurn - GAME_STATE.currentTurn,
                    arrival: pos.status === 'ARRIVED' ? 'Arrived' : 'In Transit',
                    matchId: null
                });
            });
        }

        this.positions = combined;
    },

    getSortedPositions() {
        const matched = this.positions.filter(p => p.matchId !== null);
        const unmatched = this.positions.filter(p => p.matchId === null);

        const matchGroups = {};
        matched.forEach(pos => {
            if (!matchGroups[pos.matchId]) matchGroups[pos.matchId] = [];
            matchGroups[pos.matchId].push(pos);
        });

        const sortedMatched = [];
        Object.keys(matchGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(matchId => {
            const group = matchGroups[matchId];
            const buy = group.find(p => p.type === 'BUY');
            const sell = group.find(p => p.type === 'SELL');

            if (buy) sortedMatched.push(buy);
            if (sell) sortedMatched.push(sell);
            sortedMatched.push({ separator: true, matchId: matchId });
        });

        if (sortedMatched.length > 0 && sortedMatched[sortedMatched.length - 1].separator) {
            sortedMatched.pop();
        }

        const unmatchedBuys = unmatched.filter(p => p.type === 'BUY');
        const unmatchedSells = unmatched.filter(p => p.type === 'SELL');

        return [...sortedMatched, ...unmatchedBuys, ...unmatchedSells];
    },

    render() {
        const container = document.getElementById('positionsContainer');
        if (!container) return;

        if (this.positions.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 60px; color: #666;"><div style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;">📭</div><div style="font-size: 14px;">No active positions</div></div>';
            return;
        }

        this.autoMatchByDestination();
        const sortedPositions = this.getSortedPositions();

        let html = `
            <div style="font-size: 13px; font-weight: 700; color: #4a9eff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px;">📦 CURRENT POSITIONS</div>
            <div id="matchStats" style="display: none;"></div>
            <table class="positions-table">
                <thead>
                    <tr>
                        <th>TYPE</th>
                        <th>ROUTE</th>
                        <th>TONNAGE</th>
                        <th>PRICE (INVOICE)</th>
                        <th>QP</th>
                        <th>ETA</th>
                        <th>PROJECTED P&L</th>
                        <th>STATUS</th>
                        <th>MATCH</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sortedPositions.forEach(pos => {
            if (pos.separator) {
                html += `<tr class="separator-row"><td colspan="8" style="padding: 0; height: 8px; background: transparent; border: none;"></td></tr>`;
                return;
            }

            const statusClass = pos.arrival === 'Arrived' ? 'status-arrived' :
                               pos.arrival === 'Pending Settlement' ? 'status-pending' : 'status-transit';
            const isMatched = pos.matchId !== null;
            const rowClass = isMatched ? 'matched-row' : '';

            // Calculate sale details if sold
            let matchCell = '—';
            if (pos.soldInfo) {
                const profit = pos.soldInfo.totalRevenue - (pos.price * pos.soldInfo.tonnage);
                matchCell = `
                    <div class="sale-info-icon" onclick="showSaleDetails(${JSON.stringify(pos.soldInfo).replace(/"/g, '&quot;')}, ${pos.price}, '${pos.id}')">
                        📋
                    </div>
                `;
            } else if (isMatched) {
                matchCell = `<div class="match-indicator"><span class="match-icon">✓</span><span>Match #${pos.matchId}</span></div>`;
            }

            // Determine if this position has been sold
            const hasSale = pos.soldInfo !== undefined;

            const totalInvoice = pos.tonnage * pos.price;
            const invoiceEquation = `${pos.tonnage} MT × $${Math.round(pos.price).toLocaleString('en-US')}/MT = $${Math.round(totalInvoice).toLocaleString('en-US')}`;

            // Calculate projected P&L per ton if sold
            let projectedPL = '—';
            let plClass = '';
            if (pos.soldInfo) {
                const totalCost = pos.price * pos.soldInfo.tonnage;
                const profit = pos.soldInfo.totalRevenue - totalCost;
                const profitPerTon = profit / pos.soldInfo.tonnage;
                projectedPL = (profitPerTon >= 0 ? '+' : '') + `$${Math.round(profitPerTon).toLocaleString('en-US')}/MT`;
                plClass = profitPerTon >= 0 ? 'price-positive' : 'price-negative';
            }

            html += `
                <tr class="${rowClass}">
                    <td>
                        ${hasSale ?
                            `<div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                                <span class="type-badge buy">BUY</span>
                                <span class="type-badge sell">SELL</span>
                            </div>`
                            :
                            `<span class="type-badge ${pos.type.toLowerCase()}">${pos.type}</span>`
                        }
                    </td>
                    <td><span class="route">${pos.loading}<span class="route-arrow">→</span>${pos.destination}</span></td>
                    <td>${pos.tonnage} MT</td>
                    <td class="${pos.type === 'BUY' ? 'price-negative' : 'price-positive'}" title="${invoiceEquation}">
                        ${pos.type === 'BUY' ? '-' : '+'}$${Math.round(totalInvoice).toLocaleString('en-US')}
                        <div style="font-size: 10px; color: #888; margin-top: 2px;">$${Math.round(pos.price).toLocaleString('en-US')}/MT</div>
                    </td>
                    <td>${pos.qp}</td>
                    <td>${pos.eta > 0 ? `${pos.eta} days` : 'Delivered'}</td>
                    <td class="${plClass}" style="font-weight: 700;">${projectedPL}</td>
                    <td><span class="status-badge ${statusClass}">${pos.arrival}</span></td>
                    <td>${matchCell}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
        this.renderMatchStats();
        this.renderFutures();
    },

    renderMatchStats() {
        const statsDiv = document.getElementById('matchStats');
        if (!statsDiv) return;

        const matchCount = new Set(this.positions.filter(p => p.matchId).map(p => p.matchId)).size;
        const matchedPositions = this.positions.filter(p => p.matchId).length;
        const totalPositions = this.positions.length;

        if (matchCount > 0) {
            statsDiv.style.display = 'flex';
            statsDiv.className = 'match-stats';
            statsDiv.innerHTML = `
                <div class="match-stat"><div class="match-stat-label">Matched Pairs</div><div class="match-stat-value">${matchCount}</div></div>
                <div class="match-stat"><div class="match-stat-label">Matched Positions</div><div class="match-stat-value">${matchedPositions} / ${totalPositions}</div></div>
                <div class="match-stat"><div class="match-stat-label">Coverage</div><div class="match-stat-value">${Math.round((matchedPositions / totalPositions) * 100)}%</div></div>
            `;
        } else {
            statsDiv.style.display = 'none';
        }
    },

    renderFutures() {
        const container = document.getElementById('positionsContainer');
        if (!container) return;

        const futuresHTML = `
            <div style="margin-top: 30px;">
                <div style="font-size: 13px; font-weight: 700; color: #4a9eff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px;">📊 FUTURES POSITIONS</div>
                <table class="positions-table">
                    <thead>
                        <tr>
                            <th>EXCHANGE</th>
                            <th>CONTRACT</th>
                            <th>POSITION</th>
                            <th>CONTRACT AMOUNT</th>
                            <th>VALUE OF CONTRACTS</th>
                            <th>MARGIN</th>
                        </tr>
                    </thead>
                    <tbody>${this.renderFuturesRows()}</tbody>
                </table>
            </div>
        `;

        container.innerHTML += futuresHTML;
    },

    renderFuturesRows() {
        if (!GAME_STATE.futuresPositions || GAME_STATE.futuresPositions.length === 0) {
            return '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">No futures positions</td></tr>';
        }

        return GAME_STATE.futuresPositions.map(future => {
            const posClass = future.position.toLowerCase();
            return `
                <tr>
                    <td><strong>${future.exchange}</strong></td>
                    <td>${future.contract}</td>
                    <td><span class="position-badge ${posClass}">${future.position}</span></td>
                    <td>${future.contractAmount} (${future.contractAmount * 25} MT)</td>
                    <td class="${posClass === 'short' ? 'price-negative' : 'price-positive'}">
                        ${posClass === 'short' ? '-' : '+'}$${future.value.toLocaleString('en-US')}
                    </td>
                    <td>$${future.margin.toLocaleString('en-US')}</td>
                </tr>
            `;
        }).join('');
    },

    autoMatchByDestination() {
        this.positions.forEach(pos => pos.matchId = null);

        const buys = this.positions.filter(p => p.type === 'BUY');
        const sells = this.positions.filter(p => p.type === 'SELL');

        let matchCounter = 1;
        const matched = new Set();

        buys.forEach(buy => {
            if (matched.has(buy.id)) return;

            const matchingSell = sells.find(sell =>
                !matched.has(sell.id) &&
                sell.destination === buy.destination
            );

            if (matchingSell) {
                buy.matchId = matchCounter;
                matchingSell.matchId = matchCounter;
                matched.add(buy.id);
                matched.add(matchingSell.id);
                matchCounter++;
            }
        });
    }
};

// Export the PositionsWidget object
export { PositionsWidget };
