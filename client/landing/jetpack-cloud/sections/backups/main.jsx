/**
 * External dependencies
 */
import { connect } from 'react-redux';
import React, { Component } from 'react';
import page from 'page';

/**
 * Internal dependencies
 */
import { emptyFilter } from 'state/activity-log/reducer';
// import { getBackupAttemptsForDate, getDailyBackupDeltas, getEventsInDailyBackup } from './utils';
import { getSelectedSiteId } from 'state/ui/selectors';
import { getSitePurchases } from 'state/purchases/selectors';
import { requestActivityLogs } from 'state/data-getters';
import { withLocalizedMoment } from 'components/localized-moment';
// import BackupDelta from '../../components/backup-delta';
// import DailyBackupStatus from '../../components/daily-backup-status';
import DatePicker from '../../components/date-picker';
import getRewindState from 'state/selectors/get-rewind-state';
import getSelectedSiteSlug from 'state/ui/selectors/get-selected-site-slug';
import QueryRewindState from 'components/data/query-rewind-state';
import QuerySitePurchases from 'components/data/query-site-purchases';

class BackupsPage extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			selectedDate: new Date(),
		};
	}

	onDateChange = date => {
		this.setState( { selectedDate: date } );
	};

	onDateRangeSelection = () => {
		//todo: go to the log activity view
	};

	// hasRealtimeBackups = () =>
	// 	this.props.sitePurchases &&
	// 	!! this.props.sitePurchases.filter(
	// 		purchase => 'jetpack_backup_realtime' === purchase.productSlug
	// 	).length;

	render() {
		// const { allowRestore, logs, moment, siteId, siteSlug } = this.props;
		const { siteId } = this.props;

		// const hasRealtimeBackups = this.hasRealtimeBackups();
		// const backupAttempts = getBackupAttemptsForDate( logs, selectedDateString );
		// const deltas = getDailyBackupDeltas( logs, selectedDateString );
		// const realtimeEvents = getEventsInDailyBackup( logs, selectedDateString );

		return (
			<div>
				<QueryRewindState siteId={ siteId } />
				<QuerySitePurchases siteId={ siteId } />

				<DatePicker
					onDateChange={ this.onDateChange }
					onDateRangeSelection={ this.onDateRangeSelection }
					selectedDate={ this.state.selectedDate }
					siteId={ siteId }
				/>
				{ /* Temporaly commented for this PR */ }
				{ /*<DailyBackupStatus*/ }
				{ /*allowRestore={ allowRestore }*/ }
				{ /*date={ selectedDateString }*/ }
				{ /*backupAttempts={ backupAttempts }*/ }
				{ /*siteSlug={ siteSlug }*/ }
				{ /*/>*/ }

				{ /*<BackupDelta*/ }
				{ /*{ ...{*/ }
				{ /*deltas,*/ }
				{ /*backupAttempts,*/ }
				{ /*hasRealtimeBackups,*/ }
				{ /*realtimeEvents,*/ }
				{ /*allowRestore,*/ }
				{ /*moment,*/ }
				{ /*} }*/ }
				{ /*/>*/ }
			</div>
		);
	}
}

export default connect( state => {
	const siteId = getSelectedSiteId( state );

	//The section require a valid site, if not, redirect to backups
	if ( false === !! siteId ) {
		return page.redirect( '/backups' );
	}

	const logs = requestActivityLogs( siteId, emptyFilter );
	const rewind = getRewindState( state, siteId );
	const sitePurchases = getSitePurchases( state, siteId );
	const restoreStatus = rewind.rewind && rewind.rewind.status;
	const allowRestore =
		'active' === rewind.state && ! ( 'queued' === restoreStatus || 'running' === restoreStatus );

	return {
		allowRestore,
		logs: logs?.data ?? [],
		rewind,
		siteId,
		sitePurchases,
		siteSlug: getSelectedSiteSlug( state ),
	};
} )( withLocalizedMoment( BackupsPage ) );
