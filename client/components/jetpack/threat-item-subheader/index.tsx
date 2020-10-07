/**
 * External dependencies
 */
import React from 'react';
import { translate } from 'i18n-calypso';
import classnames from 'classnames';
import moment from 'moment';

/**
 * Internal dependencies
 */
import Badge from 'components/badge';
import { Threat } from 'components/jetpack/threat-item/types';
import { getThreatType, getThreatVulnerability } from 'components/jetpack/threat-item/utils';

/**
 * Style dependencies
 */
import './style.scss';

interface Props {
	threat: Threat;
}

const entryActionClassNames = ( threat: Threat ) => {
	return {
		'is-fixed': threat.status === 'fixed',
		'is-ignored': threat.status === 'ignored',
	};
};

const formatDate = ( date: Date ) => {
	return moment( date ).format( 'LL' );
};

const getThreatStatusMessage = ( translate, action, date ) => {
	if ( action === 'fixed' ) {
		return date
			? translate( 'Threat fixed on %(date)s', {
					args: { date },
					comment: 'Past tense action: a threat was fixed on a specific date',
			  } )
			: translate( 'Threat fixed', {
					comment: 'Past tense action: a threat was fixed on an unspecified date',
			  } );
	}

	if ( action === 'ignored' ) {
		return date
			? translate( 'Threat ignored on %(date)s', {
					args: { date },
					comment: 'Past tense action: a threat was ignored on a specific date',
			  } )
			: translate( 'Threat ignored', {
					comment: 'Past tense action: a threat was ignored on an unspecified date',
			  } );
	}

	return null;
};

// This renders two different kind of sub-headers. One is for current threats (displayed
// in the Scanner section), and the other for threats in the History section.
const ThreatItemSubheader: React.FC< Props > = ( { threat } ) => {
	if ( threat.status === 'current' ) {
		switch ( getThreatType( threat ) ) {
			case 'file':
				return (
					<>
						{ translate( 'Threat found ({{signature/}})', {
							components: {
								signature: (
									<span className="threat-item-subheader__alert-signature">
										{ threat.signature }
									</span>
								),
							},
						} ) }
					</>
				);
			default:
				return <> { getThreatVulnerability( threat ) }</>;
		}
	} else {
		return (
			<>
				<div className="threat-item-subheader__subheader">
					<span className="threat-item-subheader__date">
						{ translate( 'Threat found on %s', {
							args: formatDate( threat.firstDetected ),
						} ) }
					</span>
					{ threat.fixedOn && <span className="threat-item-subheader__date-separator"></span> }
					{ threat.fixedOn && (
						<span
							className={ classnames(
								'threat-item-subheader__date',
								entryActionClassNames( threat )
							) }
						>
							{ getThreatStatusMessage( translate, threat.status, formatDate( threat.fixedOn ) ) }
						</span>
					) }
				</div>
				<Badge
					className={ classnames(
						'threat-item-subheader__badge',
						entryActionClassNames( threat )
					) }
				>
					<small>
						{ threat.status === 'fixed' ? translate( 'fixed' ) : translate( 'ignored' ) }
					</small>
				</Badge>
			</>
		);
	}
};

export default ThreatItemSubheader;
